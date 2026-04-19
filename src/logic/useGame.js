import { useState } from 'react';
import { getInitialGameState } from './game';
import { checkWinCondition } from './winCheck';
import { checkAutoClaimForFlag } from './autoClaim';

// ---- 共通ヘルパー ----

const other = (p) => (p === 'P1' ? 'P2' : 'P1');
const handKey = (p) => (p === 'P1' ? 'p1' : 'p2');
const sideKey = (p) => (p === 'P1' ? 'p1Cards' : 'p2Cards');
const requiredSizeOf = (flag) => (flag.weatherCard === 't_mud' ? 4 : 3);

// 3枚目(Mud時は4枚目)を置いたタイミングで firstCompletedBy を記録。
// 枚数変化で完成状態が壊れた場合は再評価する。
function recomputeFirstCompleted(flag) {
    const req = requiredSizeOf(flag);
    const p1Full = flag.p1Cards.length === req;
    const p2Full = flag.p2Cards.length === req;

    let fcb = flag.firstCompletedBy;
    if (fcb === 'P1' && !p1Full) fcb = null;
    if (fcb === 'P2' && !p2Full) fcb = null;
    if (!fcb) {
        if (p1Full && !p2Full) fcb = 'P1';
        else if (p2Full && !p1Full) fcb = 'P2';
        else if (p1Full && p2Full) fcb = null; // 同時完成 (現実には起きない) は放棄
    }
    return { ...flag, firstCompletedBy: fcb };
}

function applyAutoClaim(state) {
    const flags = state.flags.map(f => {
        if (f.claimedBy) return f;
        const claimer = checkAutoClaimForFlag(f, state.flags);
        return claimer ? { ...f, claimedBy: claimer } : f;
    });
    const winner = checkWinCondition(flags);
    return {
        ...state,
        flags,
        status: winner ? `${winner}_WINS` : state.status
    };
}

function afterActionFinalize(state, actor) {
    const both = state.troopDeck.length === 0 && state.tacticalDeck.length === 0;
    const next = {
        ...state,
        pendingAction: both ? null : { type: 'DRAW_CARDS', player: actor },
        turn: both ? other(actor) : state.turn
    };
    return applyAutoClaim(next);
}

function canPlayTactical(state, player, card) {
    const me = state[handKey(player)].tacticalPlayed;
    const opp = state[handKey(other(player))].tacticalPlayed;
    if (me > opp) return false; // バランスルール: 自分 > 相手 なら不可 (差 ≤ 1 を保証)
    if (card.leader && state[handKey(player)].leaderPlayed) return false; // Leader 1枚まで
    return true;
}

// ---- コアアクション ----

export const corePlayCard = (state, player, cardIndex, flagIndex) => {
    if (state.status !== 'PLAYING') return null;
    if (state.turn !== player) return null;
    if (state.pendingAction) return null;

    const pKey = handKey(player);
    const hand = state[pKey].hand;
    const card = hand[cardIndex];
    if (!card) return null;

    const flag = state.flags[flagIndex];

    // Guile は flagIndex を使わない → UI 側は flagIndex=-1 または 0 を渡す想定。
    // ここでは戦術カードの種別で分岐する。
    if (card.isTactical) {
        if (!canPlayTactical(state, player, card)) return null;

        if (card.type === 'GUILE') {
            // Guile プレイ: 手札から除去し、対応する pendingAction を立てる。
            const newHand = [...hand]; newHand.splice(cardIndex, 1);
            const updatedPlayer = {
                ...state[pKey],
                hand: newHand,
                tacticalPlayed: state[pKey].tacticalPlayed + 1
            };
            const base = { ...state, [pKey]: updatedPlayer };

            if (card.id === 't_scout') {
                return { ...base, pendingAction: { type: 'SCOUT_DRAW', player, picked: [] } };
            }
            if (card.id === 't_redeploy') {
                return { ...base, pendingAction: { type: 'REDEPLOY_SOURCE', player } };
            }
            if (card.id === 't_deserter') {
                return { ...base, pendingAction: { type: 'DESERTER_TARGET', player } };
            }
            if (card.id === 't_traitor') {
                return { ...base, pendingAction: { type: 'TRAITOR_SOURCE', player } };
            }
            return null;
        }

        if (card.type === 'WEATHER') {
            if (!flag || flag.claimedBy || flag.weatherCard) return null;
            const newHand = [...hand]; newHand.splice(cardIndex, 1);
            const newFlags = state.flags.map((f, i) =>
                i === flagIndex ? recomputeFirstCompleted({ ...f, weatherCard: card.id }) : f
            );
            const next = {
                ...state,
                [pKey]: {
                    ...state[pKey],
                    hand: newHand,
                    tacticalPlayed: state[pKey].tacticalPlayed + 1
                },
                flags: newFlags
            };
            return afterActionFinalize(next, player);
        }

        // MORALE (ワイルド): 自分の側に配置
        if (!flag || flag.claimedBy) return null;
        const sKey = sideKey(player);
        if (flag[sKey].length >= requiredSizeOf(flag)) return null;

        const newHand = [...hand]; newHand.splice(cardIndex, 1);
        const newFlags = state.flags.map((f, i) => {
            if (i !== flagIndex) return f;
            const updated = { ...f, [sKey]: [...f[sKey], card] };
            return recomputeFirstCompleted(updated);
        });
        const next = {
            ...state,
            [pKey]: {
                ...state[pKey],
                hand: newHand,
                tacticalPlayed: state[pKey].tacticalPlayed + 1,
                leaderPlayed: card.leader ? true : state[pKey].leaderPlayed
            },
            flags: newFlags
        };
        return afterActionFinalize(next, player);
    }

    // 部隊カード
    if (!flag || flag.claimedBy) return null;
    const sKey = sideKey(player);
    if (flag[sKey].length >= requiredSizeOf(flag)) return null;

    const newHand = [...hand]; newHand.splice(cardIndex, 1);
    const newFlags = state.flags.map((f, i) => {
        if (i !== flagIndex) return f;
        return recomputeFirstCompleted({ ...f, [sKey]: [...f[sKey], card] });
    });
    const next = { ...state, [pKey]: { ...state[pKey], hand: newHand }, flags: newFlags };
    return afterActionFinalize(next, player);
};

export const coreRunDraw = (state, player, deckType) => {
    if (state.pendingAction?.type !== 'DRAW_CARDS' || state.pendingAction.player !== player) return null;

    let drawn = null;
    let troop = state.troopDeck;
    let tact = state.tacticalDeck;

    if (deckType === 'TROOP' && troop.length > 0) {
        troop = [...troop]; drawn = troop.pop();
    } else if (deckType === 'TACTICAL' && tact.length > 0) {
        tact = [...tact]; drawn = tact.pop();
    }

    const pKey = handKey(player);
    const holder = state[pKey];
    const updated = drawn ? { ...holder, hand: [...holder.hand, drawn] } : holder;

    return applyAutoClaim({
        ...state,
        troopDeck: troop,
        tacticalDeck: tact,
        [pKey]: updated,
        pendingAction: null,
        turn: other(player)
    });
};

// ---- Guile: 斥候 (Scout / Outrider) ----
// 3 回に分けて山札から 1 枚ずつ pendingAction.picked に加える。
export const coreScoutPick = (state, player, deckType) => {
    if (state.pendingAction?.type !== 'SCOUT_DRAW' || state.pendingAction.player !== player) return null;
    const picked = state.pendingAction.picked;
    if (picked.length >= 3) return null;

    let troop = state.troopDeck;
    let tact = state.tacticalDeck;
    let drawn = null;

    if (deckType === 'TROOP' && troop.length > 0) {
        troop = [...troop]; drawn = troop.pop();
    } else if (deckType === 'TACTICAL' && tact.length > 0) {
        tact = [...tact]; drawn = tact.pop();
    }
    if (!drawn) return null;

    const newPicked = [...picked, drawn];
    const pendingAction = newPicked.length === 3
        ? { type: 'SCOUT_RETURN', player, picked: newPicked, returning: [] }
        : { type: 'SCOUT_DRAW', player, picked: newPicked };

    // Scout 中に引いたカードは暫定的に手札に入れる (戻し選択のため)
    const pKey = handKey(player);
    const holder = state[pKey];

    return {
        ...state,
        troopDeck: troop,
        tacticalDeck: tact,
        [pKey]: { ...holder, hand: [...holder.hand, drawn] },
        pendingAction
    };
};

// 戻すカードを手札から選ぶ (トグル)。
export const coreScoutToggleReturn = (state, player, handIndex) => {
    if (state.pendingAction?.type !== 'SCOUT_RETURN' || state.pendingAction.player !== player) return null;
    const returning = state.pendingAction.returning;
    const already = returning.includes(handIndex);
    let next;
    if (already) next = returning.filter(i => i !== handIndex);
    else if (returning.length >= 2) return null;
    else next = [...returning, handIndex];
    return { ...state, pendingAction: { ...state.pendingAction, returning: next } };
};

// 確定: 選択 2 枚を手札から抜き、山札の種別に応じて上に戻す。ターン終了 (追加ドロー無し)。
export const coreScoutCommit = (state, player) => {
    if (state.pendingAction?.type !== 'SCOUT_RETURN' || state.pendingAction.player !== player) return null;
    const { returning } = state.pendingAction;
    if (returning.length !== 2) return null;

    const pKey = handKey(player);
    const hand = state[pKey].hand;
    const cardsOut = returning.map(i => hand[i]);
    const newHand = hand.filter((_, i) => !returning.includes(i));

    let troop = state.troopDeck;
    let tact = state.tacticalDeck;
    for (const c of cardsOut) {
        if (c.isTactical) { tact = [...tact, c]; }
        else              { troop = [...troop, c]; }
    }

    // Scout 完了 → ターン終了 (追加ドロー無し)
    return applyAutoClaim({
        ...state,
        troopDeck: troop,
        tacticalDeck: tact,
        [pKey]: { ...state[pKey], hand: newHand },
        pendingAction: null,
        turn: other(player)
    });
};

// ---- Guile: 陣変え (Reposition / Redeploy) ----
// 自軍カード 1 枚を選ぶ → 目的地フラッグへ移動 or 捨て札
export const coreRedeploySelectSource = (state, player, flagIdx, cardIdx) => {
    if (state.pendingAction?.type !== 'REDEPLOY_SOURCE' || state.pendingAction.player !== player) return null;
    const flag = state.flags[flagIdx];
    if (!flag || flag.claimedBy) return null;
    const sKey = sideKey(player);
    if (cardIdx < 0 || cardIdx >= flag[sKey].length) return null;

    return {
        ...state,
        pendingAction: { type: 'REDEPLOY_DEST', player, source: { flagIdx, cardIdx } }
    };
};

// 目的地指定。destFlagIdx === -1 なら捨て札。
export const coreRedeployCommit = (state, player, destFlagIdx) => {
    if (state.pendingAction?.type !== 'REDEPLOY_DEST' || state.pendingAction.player !== player) return null;
    const { flagIdx, cardIdx } = state.pendingAction.source;
    const sKey = sideKey(player);
    const srcFlag = state.flags[flagIdx];
    const card = srcFlag[sKey][cardIdx];
    if (!card) return null;

    // 抜き取り
    let flags = state.flags.map((f, i) => {
        if (i !== flagIdx) return f;
        const side = [...f[sKey]]; side.splice(cardIdx, 1);
        return recomputeFirstCompleted({ ...f, [sKey]: side });
    });

    if (destFlagIdx === -1) {
        // 捨て札 (Nine Banners では使用済み戦術/部隊は純粋に場外へ)
    } else {
        const destFlag = flags[destFlagIdx];
        if (!destFlag || destFlag.claimedBy) return null;
        if (destFlag[sKey].length >= requiredSizeOf(destFlag)) return null;
        flags = flags.map((f, i) => {
            if (i !== destFlagIdx) return f;
            return recomputeFirstCompleted({ ...f, [sKey]: [...f[sKey], card] });
        });
    }

    return afterActionFinalize({ ...state, flags, pendingAction: null }, player);
};

// ---- Guile: 脱走 (Desertion / Deserter) ----
export const coreDeserterCommit = (state, player, flagIdx, cardIdx) => {
    if (state.pendingAction?.type !== 'DESERTER_TARGET' || state.pendingAction.player !== player) return null;
    const flag = state.flags[flagIdx];
    if (!flag || flag.claimedBy) return null;
    const oppSide = sideKey(other(player));
    if (cardIdx < 0 || cardIdx >= flag[oppSide].length) return null;

    const flags = state.flags.map((f, i) => {
        if (i !== flagIdx) return f;
        const side = [...f[oppSide]]; side.splice(cardIdx, 1);
        return recomputeFirstCompleted({ ...f, [oppSide]: side });
    });
    return afterActionFinalize({ ...state, flags, pendingAction: null }, player);
};

// ---- Guile: 裏切り (Turncoat / Traitor) ----
// 敵の部隊 (TROOP) を 1 枚選ぶ → 自軍の未獲得フラッグの空きへ配置
export const coreTraitorSelectSource = (state, player, flagIdx, cardIdx) => {
    if (state.pendingAction?.type !== 'TRAITOR_SOURCE' || state.pendingAction.player !== player) return null;
    const flag = state.flags[flagIdx];
    if (!flag || flag.claimedBy) return null;
    const oppSide = sideKey(other(player));
    const card = flag[oppSide][cardIdx];
    if (!card) return null;
    if (card.isTactical) return null; // 部隊カードのみ対象

    return {
        ...state,
        pendingAction: { type: 'TRAITOR_DEST', player, source: { flagIdx, cardIdx } }
    };
};

export const coreTraitorCommit = (state, player, destFlagIdx) => {
    if (state.pendingAction?.type !== 'TRAITOR_DEST' || state.pendingAction.player !== player) return null;
    const { flagIdx, cardIdx } = state.pendingAction.source;
    const oppSide = sideKey(other(player));
    const mySide  = sideKey(player);
    const srcFlag = state.flags[flagIdx];
    const card = srcFlag[oppSide][cardIdx];
    if (!card) return null;

    let flags = state.flags.map((f, i) => {
        if (i !== flagIdx) return f;
        const side = [...f[oppSide]]; side.splice(cardIdx, 1);
        return recomputeFirstCompleted({ ...f, [oppSide]: side });
    });

    const destFlag = flags[destFlagIdx];
    if (!destFlag || destFlag.claimedBy) return null;
    if (destFlag[mySide].length >= requiredSizeOf(destFlag)) return null;

    flags = flags.map((f, i) => {
        if (i !== destFlagIdx) return f;
        return recomputeFirstCompleted({ ...f, [mySide]: [...f[mySide], card] });
    });

    return afterActionFinalize({ ...state, flags, pendingAction: null }, player);
};

// Guile キャンセル (pending 中のみ)
export const coreGuileCancel = (state, player) => {
    if (!state.pendingAction) return null;
    if (state.pendingAction.player !== player) return null;
    const t = state.pendingAction.type;
    if (t === 'DRAW_CARDS') return null;
    if (t === 'REDEPLOY_DEST')
        return { ...state, pendingAction: { type: 'REDEPLOY_SOURCE', player } };
    if (t === 'TRAITOR_DEST')
        return { ...state, pendingAction: { type: 'TRAITOR_SOURCE', player } };
    return null; // SCOUT / その他 2段階状態からの中断はサポートしない (仕様簡略化)
};

// ---- React フックラッパー (ローカル動作用) ----

export function useGame() {
    const [state, setState] = useState(getInitialGameState());

    const wrap = (fn) => (currentState, ...args) => {
        const newState = fn(currentState || state, ...args);
        if (newState && !currentState) setState(newState);
        return newState;
    };

    return {
        state, setState,
        playCard: wrap(corePlayCard),
        runDraw: wrap(coreRunDraw),
        scoutPick: wrap(coreScoutPick),
        scoutToggleReturn: wrap(coreScoutToggleReturn),
        scoutCommit: wrap(coreScoutCommit),
        redeploySelectSource: wrap(coreRedeploySelectSource),
        redeployCommit: wrap(coreRedeployCommit),
        deserterCommit: wrap(coreDeserterCommit),
        traitorSelectSource: wrap(coreTraitorSelectSource),
        traitorCommit: wrap(coreTraitorCommit),
        guileCancel: wrap(coreGuileCancel)
    };
}
