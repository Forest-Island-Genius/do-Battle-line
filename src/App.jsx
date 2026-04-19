import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useGame } from './logic/useGame';
import { getInitialGameState } from './logic/game';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
import { Card } from './components/Card';
import { syncGameState, listenToGameState, createRoom } from './firebase';
import emblemUrl from './assets/emblem.svg';
import './App.css';

// ---- 確認モーダル ----
function ConfirmModal({ message, detail, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
                <div className="modal-message">{message}</div>
                {detail && <div className="modal-detail">{detail}</div>}
                <div className="modal-actions">
                    <button className="modal-btn cancel" onClick={onCancel}>キャンセル</button>
                    <button className="modal-btn confirm" onClick={onConfirm}>確定</button>
                </div>
            </div>
        </div>
    );
}

function App() {
    const [searchParams, setSearchParams] = useSearchParams();
    const roomId   = searchParams.get('room');
    const playerRole = searchParams.get('player');

    const g = useGame();
    const { state: localState } = g;
    const [remoteState, setRemoteState] = useState(null);
    const [selectedCardIdx, setSelectedCardIdx] = useState(null);
    const [copyStatus, setCopyStatus] = useState('invite');

    const [pendingCardPlay, setPendingCardPlay] = useState(null);
    const [pendingDraw, setPendingDraw]         = useState(null);

    const [playError, setPlayError] = useState(null);
    useEffect(() => {
        if (!playError) return;
        const id = setTimeout(() => setPlayError(null), 2500);
        return () => clearTimeout(id);
    }, [playError]);

    useEffect(() => {
        if (roomId && !playerRole) setSearchParams({ room: roomId, player: 'P2' });
    }, [roomId, playerRole, setSearchParams]);

    useEffect(() => {
        if (!roomId || !playerRole) return;
        const unsub = listenToGameState(roomId, setRemoteState);
        return () => unsub();
    }, [roomId, playerRole]);

    const handleRoomCreate = async () => {
        const newRoom = nanoid(6).toUpperCase();
        const init = getInitialGameState();
        await createRoom(newRoom, init);
        setSearchParams({ room: newRoom, player: 'P1' });
    };

    const handleRoomJoin = (e) => {
        e.preventDefault();
        const fd   = new FormData(e.target);
        const code = fd.get('roomCode').toUpperCase();
        setSearchParams({ room: code, player: 'P2' });
    };

    const handleCopyInvite = () => {
        const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('invite'), 2000);
        });
    };

    if (!roomId || !playerRole) {
        return (
            <div className="lobby-container">
                <div className="lobby-card">
                    <img src={emblemUrl} alt="" className="lobby-emblem" />
                    <h1>Nine Banners</h1>
                    <p className="lobby-subtitle">九旗の対戦</p>
                    <span className="lobby-rule" aria-hidden="true" />
                    <div className="lobby-actions">
                        <button onClick={handleRoomCreate} className="lobby-btn create-btn">
                            軍旗を掲げる (P1)
                        </button>
                        <div className="divider"><span>または</span></div>
                        <form onSubmit={handleRoomJoin} className="join-room-form">
                            <input type="text" name="roomCode" placeholder="ルームコードを入力" required maxLength="6" />
                            <button type="submit" className="lobby-btn join-btn">参戦する (P2)</button>
                        </form>
                        <div className="firebase-hint">
                            ※オンライン対戦には Firebase の設定が必要です (.env.example を参照)
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const myRole       = playerRole;
    const opponentRole = playerRole === 'P1' ? 'P2' : 'P1';

    const activeState = remoteState || (myRole ? null : localState);
    if (!activeState) return <div className="loading">通信環境を確認中...</div>;

    const applyAndSync = (newState) => {
        if (!newState) return;
        setRemoteState(newState);
        syncGameState(roomId, newState);
    };

    const pa = activeState.pendingAction;
    const isMyGuile = pa && pa.player === myRole && pa.type !== 'DRAW_CARDS';

    // ---- 通常プレイ: 手札クリック ----
    const handleCardClick = (idx, playerClickedHand) => {
        if (myRole !== playerClickedHand) return;
        if (activeState.turn !== myRole || activeState.status !== 'PLAYING') return;

        // Scout 戻し選択モード
        if (pa?.type === 'SCOUT_RETURN' && pa.player === myRole) {
            const ns = g.scoutToggleReturn(activeState, myRole, idx);
            if (ns) applyAndSync(ns);
            return;
        }

        if (activeState.pendingAction) return;
        setSelectedCardIdx(prev => prev === idx ? null : idx);
    };

    // ---- 通常プレイ: フラッグクリック ----
    const handleFlagClick = (flagIdx) => {
        // Guile 目的地
        if (isMyGuile) {
            if (pa.type === 'REDEPLOY_DEST') {
                const ns = g.redeployCommit(activeState, myRole, flagIdx);
                if (ns) applyAndSync(ns);
                else setPlayError('この陣地には配置できません');
                return;
            }
            if (pa.type === 'TRAITOR_DEST') {
                const ns = g.traitorCommit(activeState, myRole, flagIdx);
                if (ns) applyAndSync(ns);
                else setPlayError('寝返り先には空きと未獲得が必要です');
                return;
            }
            return; // 他 Guile 状態ではフラッグ全体クリックは無視
        }

        if (selectedCardIdx === null || activeState.status !== 'PLAYING' || activeState.pendingAction) return;
        if (activeState.turn !== myRole) return;

        const hand = myRole === 'P1' ? activeState.p1.hand : activeState.p2.hand;
        const card = hand[selectedCardIdx];
        if (!card) return;

        if (card.isTactical) {
            const mePlayed  = activeState[myRole === 'P1' ? 'p1' : 'p2'].tacticalPlayed;
            const oppPlayed = activeState[myRole === 'P1' ? 'p2' : 'p1'].tacticalPlayed;
            if (mePlayed > oppPlayed) {
                setPlayError('戦術カードはこれ以上プレイできません (相手より多く使用済)');
                return;
            }
            if (card.leader && activeState[myRole === 'P1' ? 'p1' : 'p2'].leaderPlayed) {
                setPlayError('獅子旗と鷲旗は合わせて 1 枚までです');
                return;
            }
            if (card.type === 'GUILE') {
                // Guile はフラッグ不要。クリックされた flag は無視して起動。
                const ns = g.playCard(activeState, myRole, selectedCardIdx, 0);
                if (ns) { applyAndSync(ns); setSelectedCardIdx(null); }
                return;
            }
        }

        const targetFlag = activeState.flags[flagIdx];
        if (card.isTactical && card.type === 'WEATHER' && targetFlag.weatherCard) {
            setPlayError('このフラッグには既に天候カードが設置されています');
            return;
        }

        const cardName = card.isTactical
            ? `戦術カード「${card.nameJa || card.name}」`
            : `${card.color} ${card.value}`;
        setPendingCardPlay({ cardIdx: selectedCardIdx, flagIdx, cardName, flagNo: flagIdx + 1 });
    };

    const commitCardPlay = () => {
        if (!pendingCardPlay) return;
        const newState = g.playCard(activeState, myRole, pendingCardPlay.cardIdx, pendingCardPlay.flagIdx);
        applyAndSync(newState);
        setSelectedCardIdx(null);
        setPendingCardPlay(null);
    };

    const cancelCardPlay = () => setPendingCardPlay(null);

    // ---- ドロー ----
    const handleDraw = (deckType) => {
        if (pa?.type !== 'DRAW_CARDS' || activeState.turn !== myRole) return;
        const deckName = deckType === 'TROOP' ? '部隊カード' : '戦術カード';
        setPendingDraw({ deckType, deckName });
    };
    const commitDraw = () => {
        if (!pendingDraw) return;
        const ns = g.runDraw(activeState, myRole, pendingDraw.deckType);
        applyAndSync(ns);
        setPendingDraw(null);
    };
    const cancelDraw = () => setPendingDraw(null);

    // ---- Guile: フラッグ上カードクリック ----
    const handleFlagCardClick = (flagIdx, side, cardIdx) => {
        if (!isMyGuile) return;
        if (pa.type === 'DESERTER_TARGET' && side !== myRole) {
            const ns = g.deserterCommit(activeState, myRole, flagIdx, cardIdx);
            if (ns) applyAndSync(ns);
            else setPlayError('そのカードは対象外です');
            return;
        }
        if (pa.type === 'TRAITOR_SOURCE' && side !== myRole) {
            const ns = g.traitorSelectSource(activeState, myRole, flagIdx, cardIdx);
            if (ns) applyAndSync(ns);
            else setPlayError('部隊カードのみ寝返らせられます');
            return;
        }
        if (pa.type === 'REDEPLOY_SOURCE' && side === myRole) {
            const ns = g.redeploySelectSource(activeState, myRole, flagIdx, cardIdx);
            if (ns) applyAndSync(ns);
            return;
        }
    };

    const flagTargetable = (flag, _idx) => {
        if (!isMyGuile) return null;
        if (flag.claimedBy) return null;
        if (pa.type === 'DESERTER_TARGET') return { own: false, opp: true };
        if (pa.type === 'TRAITOR_SOURCE')  return { own: false, opp: true };
        if (pa.type === 'REDEPLOY_SOURCE') return { own: true, opp: false };
        return null;
    };
    const destHighlight = (flag, idx) => {
        if (!isMyGuile) return false;
        if (flag.claimedBy) return false;
        if (pa.type === 'REDEPLOY_DEST') {
            if (idx === pa.source.flagIdx) return false;
            const sKey = myRole === 'P1' ? 'p1Cards' : 'p2Cards';
            return flag[sKey].length < (flag.weatherCard === 't_mud' ? 4 : 3);
        }
        if (pa.type === 'TRAITOR_DEST') {
            const sKey = myRole === 'P1' ? 'p1Cards' : 'p2Cards';
            return flag[sKey].length < (flag.weatherCard === 't_mud' ? 4 : 3);
        }
        return false;
    };

    // ---- Scout ドロー選択 ----
    const handleScoutPick = (deckType) => {
        const ns = g.scoutPick(activeState, myRole, deckType);
        if (ns) applyAndSync(ns);
        else setPlayError('その山札は空です');
    };
    const handleScoutCommit = () => {
        const ns = g.scoutCommit(activeState, myRole);
        if (ns) applyAndSync(ns);
    };
    const handleGuileCancel = () => {
        const ns = g.guileCancel(activeState, myRole);
        if (ns) applyAndSync(ns);
    };
    const handleRedeployDiscard = () => {
        const ns = g.redeployCommit(activeState, myRole, -1);
        if (ns) applyAndSync(ns);
    };

    // ---- 手札描画 ----
    const getHand = (player) => player === 'P1' ? activeState.p1.hand : activeState.p2.hand;

    const renderHand = (targetPlayer) => {
        const isMe     = targetPlayer === myRole;
        const isMyTurn = activeState.turn === targetPlayer;
        const hand     = getHand(targetPlayer);

        const areaClass = [
            'player-area',
            isMe ? 'bottom-player-area' : 'top-player-area',
            isMyTurn ? 'active' : (isMe ? 'my-wait' : 'inactive'),
        ].join(' ');

        const scoutReturning = pa?.type === 'SCOUT_RETURN' && pa.player === myRole && isMe
            ? new Set(pa.returning) : null;

        return (
            <div key={targetPlayer} className={areaClass}>
                <Hand
                    cards={hand}
                    playerName={targetPlayer === 'P1' ? 'プレイヤー 1' : 'プレイヤー 2'}
                    isMe={isMe}
                    isCurrentTurn={isMyTurn && isMe}
                    onCardClick={(idx) => handleCardClick(idx, targetPlayer)}
                    selectedCardIndex={isMe ? selectedCardIdx : null}
                    faceDown={!isMe}
                    highlightIndices={scoutReturning}
                />
            </div>
        );
    };

    // ---- Guile ヒントメッセージ ----
    const guileHint = (() => {
        if (!isMyGuile) return null;
        switch (pa.type) {
            case 'SCOUT_DRAW':    return `斥候: 山札を選んで合計3枚引きます (${pa.picked.length}/3)`;
            case 'SCOUT_RETURN':  return `斥候: 手札から戻す2枚を選択してください (${pa.returning.length}/2)`;
            case 'REDEPLOY_SOURCE': return '陣変え: 移動させる自軍カードをクリックしてください';
            case 'REDEPLOY_DEST':   return '陣変え: 配置先フラッグをクリック (または捨て札)';
            case 'DESERTER_TARGET': return '脱走: 捨てる相手のカードをクリックしてください';
            case 'TRAITOR_SOURCE':  return '裏切り: 寝返らせる相手の部隊カードをクリックしてください';
            case 'TRAITOR_DEST':    return '裏切り: 寝返った部隊の配置先フラッグをクリック';
            default: return null;
        }
    })();

    return (
        <div className="app-container">
            {playError && <div className="play-error-toast">{playError}</div>}

            {pendingCardPlay && (
                <ConfirmModal
                    message={`フラッグ ${pendingCardPlay.flagNo} に配置しますか？`}
                    detail={`カード: ${pendingCardPlay.cardName}`}
                    onConfirm={commitCardPlay}
                    onCancel={cancelCardPlay}
                />
            )}
            {pendingDraw && (
                <ConfirmModal
                    message={`${pendingDraw.deckName}からドローしますか？`}
                    detail="ドロー後、相手のターンに移ります"
                    onConfirm={commitDraw}
                    onCancel={cancelDraw}
                />
            )}

            <header className="game-header">
                <div className="header-left">
                    <img src={emblemUrl} alt="" className="header-emblem" />
                    <h1>Nine Banners</h1>
                    <div className="room-info">
                        ルームコード: <span className="room-code">{roomId}</span>
                        <span className="player-role-badge">{myRole}</span>
                        <button className={`copy-invite-btn ${copyStatus}`} onClick={handleCopyInvite}>
                            {copyStatus === 'invite' ? '招待リンクをコピー' : 'コピー完了'}
                        </button>
                    </div>
                </div>
                <div className="status-indicator">
                    {activeState.status === 'PLAYING' ? (
                        pa?.type === 'DRAW_CARDS' ? (
                            <span className="status-msg draw">
                                {activeState.turn === myRole ? '山札からカードを引いてください' : '相手がカードを引いています...'}
                            </span>
                        ) : isMyGuile ? (
                            <span className="status-msg draw">{guileHint}</span>
                        ) : pa && pa.player !== myRole ? (
                            <span className="status-msg">相手が戦術を発動中...</span>
                        ) : (
                            <span className={`status-msg turn ${activeState.turn === myRole ? 'my-turn' : ''}`}>
                                {activeState.turn === myRole ? 'あなたのターンです' : '相手のターンです...'}
                            </span>
                        )
                    ) : (
                        <div className="game-over">
                            <span className="winner-text">
                                {activeState.status.replace('_WINS', ' の勝利！').replace('P1', 'プレイヤー1').replace('P2', 'プレイヤー2')}
                            </span>
                            <button onClick={() => setSearchParams({})} className="re-lobby-btn">陣を引く</button>
                        </div>
                    )}
                </div>
            </header>

            <main className="game-area">
                {renderHand(opponentRole)}

                <Board
                    flags={activeState.flags}
                    onFlagClick={handleFlagClick}
                    onCardClick={handleFlagCardClick}
                    flagTargetable={flagTargetable}
                    destinationHighlight={destHighlight}
                    myRole={myRole}
                />

                <div className="decks-area">
                    {pa?.type === 'DRAW_CARDS' && activeState.turn === myRole && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>ドローする山札を選択</h3>
                                <div className="deck-buttons">
                                    <button className="deck-btn troop-deck-btn" onClick={() => handleDraw('TROOP')}
                                            disabled={activeState.troopDeck.length === 0}>
                                        <div className="deck-name">部隊カード</div>
                                        <div className="deck-count">{activeState.troopDeck.length}枚</div>
                                    </button>
                                    <button className="deck-btn tactical-deck-btn" onClick={() => handleDraw('TACTICAL')}
                                            disabled={activeState.tacticalDeck.length === 0}>
                                        <div className="deck-name">戦術カード</div>
                                        <div className="deck-count">{activeState.tacticalDeck.length}枚</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMyGuile && pa.type === 'SCOUT_DRAW' && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>斥候: 引く山札 ({pa.picked.length}/3)</h3>
                                <div className="deck-buttons">
                                    <button className="deck-btn troop-deck-btn" onClick={() => handleScoutPick('TROOP')}
                                            disabled={activeState.troopDeck.length === 0}>
                                        <div className="deck-name">部隊カード</div>
                                        <div className="deck-count">{activeState.troopDeck.length}枚</div>
                                    </button>
                                    <button className="deck-btn tactical-deck-btn" onClick={() => handleScoutPick('TACTICAL')}
                                            disabled={activeState.tacticalDeck.length === 0}>
                                        <div className="deck-name">戦術カード</div>
                                        <div className="deck-count">{activeState.tacticalDeck.length}枚</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMyGuile && pa.type === 'SCOUT_RETURN' && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>斥候: 山札に戻す 2 枚</h3>
                                <div className="scout-picked-preview">
                                    {pa.picked.map((c, i) => (
                                        <div className="scout-picked-card" key={i}>
                                            <Card card={c} />
                                        </div>
                                    ))}
                                </div>
                                <div className="scout-help">下の手札から 2 枚クリックで選択</div>
                                <button className="deck-btn" onClick={handleScoutCommit}
                                        disabled={pa.returning.length !== 2}>
                                    <div className="deck-name">確定</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {isMyGuile && pa.type === 'REDEPLOY_DEST' && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>陣変え: 移動先 or 捨て札</h3>
                                <div className="deck-buttons">
                                    <button className="deck-btn" onClick={handleRedeployDiscard}>
                                        <div className="deck-name">捨て札にする</div>
                                    </button>
                                    <button className="deck-btn" onClick={handleGuileCancel}>
                                        <div className="deck-name">選び直す</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isMyGuile && (pa.type === 'TRAITOR_DEST') && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>裏切り: 配置先フラッグをクリック</h3>
                                <button className="deck-btn" onClick={handleGuileCancel}>
                                    <div className="deck-name">選び直す</div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {renderHand(myRole)}
            </main>
        </div>
    );
}

export default App;
