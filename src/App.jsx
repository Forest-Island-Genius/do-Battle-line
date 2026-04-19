import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useGame } from './logic/useGame';
import { getInitialGameState } from './logic/game';
import { Board } from './components/Board';
import { Hand } from './components/Hand';
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
    const playerRole = searchParams.get('player'); // 'P1' or 'P2'

    const { state: localState, playCard, runDraw } = useGame();
    const [remoteState, setRemoteState] = useState(null);
    const [selectedCardIdx, setSelectedCardIdx] = useState(null);
    const [copyStatus, setCopyStatus] = useState('invite');

    // 確認モーダル用の pending 状態
    const [pendingCardPlay, setPendingCardPlay] = useState(null);
    const [pendingDraw, setPendingDraw]         = useState(null);

    // 操作が拒否された時の一時的フィードバック
    const [playError, setPlayError] = useState(null);
    useEffect(() => {
        if (!playError) return;
        const id = setTimeout(() => setPlayError(null), 2500);
        return () => clearTimeout(id);
    }, [playError]);

    // ---- Auto-join logic if room is in URL but player isn't ----
    useEffect(() => {
        if (roomId && !playerRole) {
            setSearchParams({ room: roomId, player: 'P2' });
        }
    }, [roomId, playerRole, setSearchParams]);

    // ---- Firebase / BroadcastChannel リアルタイム同期 ----
    useEffect(() => {
        if (!roomId || !playerRole) return;
        const unsub = listenToGameState(roomId, (newState) => {
            setRemoteState(newState);
        });
        return () => unsub();
    }, [roomId, playerRole]);

    // ---- ロビー画面 ----
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

    // 自分の役と相手の役
    const myRole       = playerRole;                          // 'P1' or 'P2'
    const opponentRole = playerRole === 'P1' ? 'P2' : 'P1';

    // ---- ゲーム状態の決定 ----
    const activeState = remoteState || (myRole ? null : localState);
    // Note: Always rely on remoteState in multiplayer.
    // If remoteState is null and we have roomId, wait for it.
    if (!activeState) return <div className="loading">通信環境を確認中...</div>;

    // ---- 状態を更新して即反映 + 相手タブへ送信 ----
    const applyAndSync = (newState) => {
        if (!newState) return;
        setRemoteState(newState);         // 送信元タブ即時反映
        syncGameState(roomId, newState);  // 相手タブへ BroadcastChannel / Firebase 経由で送信
    };

    // ---- カード選択 ----
    const handleCardClick = (idx, playerClickedHand) => {
        if (myRole !== playerClickedHand) return;
        if (activeState.turn !== myRole || activeState.status !== 'PLAYING' || activeState.pendingAction) return;
        setSelectedCardIdx(prev => prev === idx ? null : idx);
    };

    // ---- フラッグクリック → 確認ダイアログ ----
    const handleFlagClick = (flagIdx) => {
        if (selectedCardIdx === null || activeState.status !== 'PLAYING' || activeState.pendingAction) return;
        if (activeState.turn !== myRole) return;

        const hand = myRole === 'P1' ? activeState.p1.hand : activeState.p2.hand;
        const card = hand[selectedCardIdx];
        if (!card) return;

        // 戦術カード累計差のルール (自分が相手を上回っている時は使用不可)
        if (card.isTactical) {
            const mePlayed = myRole === 'P1' ? activeState.p1.tacticalPlayed : activeState.p2.tacticalPlayed;
            const oppPlayed = myRole === 'P1' ? activeState.p2.tacticalPlayed : activeState.p1.tacticalPlayed;
            if (mePlayed > oppPlayed) {
                setPlayError('戦術カードはこれ以上プレイできません (相手より多く使用済)');
                return;
            }
        }
        // 天候カードは1フラッグ1枚のみ
        const targetFlag = activeState.flags[flagIdx];
        if (card.isTactical && card.type === 'WEATHER' && targetFlag.weatherCard) {
            setPlayError('このフラッグには既に天候カードが設置されています');
            return;
        }

        const cardName = card.isTactical
            ? `戦術カード「${card.name || card.id}」`
            : `${card.color} ${card.value}`;
        setPendingCardPlay({ cardIdx: selectedCardIdx, flagIdx, cardName, flagNo: flagIdx + 1 });
    };

    const commitCardPlay = () => {
        if (!pendingCardPlay) return;
        const newState = playCard(activeState, myRole, pendingCardPlay.cardIdx, pendingCardPlay.flagIdx);
        applyAndSync(newState);
        setSelectedCardIdx(null);
        setPendingCardPlay(null);
    };

    const cancelCardPlay = () => setPendingCardPlay(null);

    // ---- ドロー選択 → 確認ダイアログ ----
    const handleDraw = (deckType) => {
        if (activeState.pendingAction?.type !== 'DRAW_CARDS') return;
        if (activeState.turn !== myRole) return;
        const deckName = deckType === 'TROOP' ? '部隊カード' : '戦術カード';
        setPendingDraw({ deckType, deckName });
    };

    const commitDraw = () => {
        if (!pendingDraw) return;
        const newState = runDraw(activeState, myRole, pendingDraw.deckType);
        applyAndSync(newState);
        setPendingDraw(null);
    };

    const cancelDraw = () => setPendingDraw(null);

    // ---- 手札描画 ----
    const getPlayerHand = (player) =>
        player === 'P1' ? activeState.p1.hand : activeState.p2.hand;

    const renderHand = (targetPlayer) => {
        const isMe     = targetPlayer === myRole;
        const isMyTurn = activeState.turn === targetPlayer;
        const hand     = getPlayerHand(targetPlayer);

        // 自分: 常にある程度表示（待機中は my-wait で少し透明）
        // 相手: inactive（かなり薄い）
        const areaClass = [
            'player-area',
            isMe ? 'bottom-player-area' : 'top-player-area',
            isMyTurn ? 'active' : (isMe ? 'my-wait' : 'inactive'),
        ].join(' ');


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
                />
            </div>
        );
    };

    return (
        <div className="app-container">
            {playError && (
                <div className="play-error-toast">{playError}</div>
            )}
            {/* 確認モーダル: カード配置 */}
            {pendingCardPlay && (
                <ConfirmModal
                    message={`フラッグ ${pendingCardPlay.flagNo} に配置しますか？`}
                    detail={`カード: ${pendingCardPlay.cardName}`}
                    onConfirm={commitCardPlay}
                    onCancel={cancelCardPlay}
                />
            )}

            {/* 確認モーダル: ドロー */}
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
                        <button
                            className={`copy-invite-btn ${copyStatus}`}
                            onClick={handleCopyInvite}
                        >
                            {copyStatus === 'invite' ? '招待リンクをコピー' : 'コピー完了'}
                        </button>
                    </div>
                </div>
                <div className="status-indicator">
                    {activeState.status === 'PLAYING' ? (
                        activeState.pendingAction ? (
                            <span className="status-msg draw">
                                {activeState.turn === myRole ? '山札からカードを引いてください' : '相手がカードを引いています...'}
                            </span>
                        ) : (
                            <span className={`status-msg turn ${activeState.turn === myRole ? 'my-turn' : ''}`}>
                                {activeState.turn === myRole ? '⚔️ あなたのターンです' : '⏳ 相手のターンです...'}
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
                {/* 相手の手札を上に、自分の手札を下に */}
                {renderHand(opponentRole)}

                <Board
                    flags={activeState.flags}
                    onFlagClick={handleFlagClick}
                    currentPlayer={activeState.turn}
                    myRole={myRole}
                />

                <div className="decks-area">
                    {activeState.pendingAction?.type === 'DRAW_CARDS' && activeState.turn === myRole && (
                        <div className="draw-overlay">
                            <div className="draw-prompt">
                                <h3>ドローする山札を選択</h3>
                                <div className="deck-buttons">
                                    <button
                                        className="deck-btn troop-deck-btn"
                                        onClick={() => handleDraw('TROOP')}
                                        disabled={activeState.troopDeck.length === 0}
                                    >
                                        <div className="deck-name">部隊カード</div>
                                        <div className="deck-count">{activeState.troopDeck.length}枚</div>
                                    </button>
                                    <button
                                        className="deck-btn tactical-deck-btn"
                                        onClick={() => handleDraw('TACTICAL')}
                                        disabled={activeState.tacticalDeck.length === 0}
                                    >
                                        <div className="deck-name">戦術カード</div>
                                        <div className="deck-count">{activeState.tacticalDeck.length}枚</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 自分の手札は常に下 */}
                {renderHand(myRole)}
            </main>
        </div>
    );
}

export default App;
