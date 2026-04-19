import { useState } from 'react';
import { getInitialGameState } from './game';
import { checkWinCondition } from './winCheck';
import { checkAutoClaimForFlag } from './autoClaim';

// ---- 純粋ロジック関数 (マルチプレイヤー同期用) ----

// プレイ後の共通処理: 自動獲得判定、勝者判定、次アクション設定
function finalizeTurn(state, actor) {
    const autoClaimedFlags = state.flags.map(f => {
        if (f.claimedBy) return f;
        const claimer = checkAutoClaimForFlag(f, state.flags);
        return claimer ? { ...f, claimedBy: claimer } : f;
    });

    const bothDecksEmpty =
        state.troopDeck.length === 0 && state.tacticalDeck.length === 0;

    const next = {
        ...state,
        flags: autoClaimedFlags,
        pendingAction: bothDecksEmpty ? null : { type: 'DRAW_CARDS', player: actor },
        turn: bothDecksEmpty ? (actor === 'P1' ? 'P2' : 'P1') : state.turn,
    };

    const winner = checkWinCondition(next.flags);
    if (winner) next.status = winner + '_WINS';

    return next;
}

// 戦術カードバランス制約: 自分の累計が相手を上回って使うことはできない
function canPlayTactical(state, player) {
    const me = player === 'P1' ? state.p1.tacticalPlayed : state.p2.tacticalPlayed;
    const opp = player === 'P1' ? state.p2.tacticalPlayed : state.p1.tacticalPlayed;
    return me <= opp;
}

export const corePlayCard = (state, player, cardIndex, flagIndex) => {
    if (state.status !== 'PLAYING') return null;
    if (state.turn !== player) return null;
    if (state.pendingAction) return null;

    const handKey = player === 'P1' ? 'p1' : 'p2';
    const hand = state[handKey].hand;
    const card = hand[cardIndex];
    if (!card) return null;

    const flag = state.flags[flagIndex];
    if (!flag || flag.claimedBy) return null;

    if (card.isTactical && !canPlayTactical(state, player)) return null;

    const newHand = [...hand];
    newHand.splice(cardIndex, 1);

    let newFlags;

    if (card.isTactical && card.type === 'WEATHER') {
        // 天候カード: flag.weatherCard に付与
        if (flag.weatherCard) return null;
        newFlags = state.flags.map((f, i) =>
            i === flagIndex ? { ...f, weatherCard: card.id } : f
        );
    } else {
        // 部隊 or 士気 (ワイルド): 自分の側に配置
        const sideKey = player === 'P1' ? 'p1Cards' : 'p2Cards';
        const requiredSize = flag.weatherCard === 't_mud' ? 4 : 3;
        if (flag[sideKey].length >= requiredSize) return null;

        newFlags = state.flags.map((f, i) =>
            i === flagIndex ? { ...f, [sideKey]: [...f[sideKey], card] } : f
        );
    }

    const prevPlayer = state[handKey];
    const updatedPlayer = {
        ...prevPlayer,
        hand: newHand,
        tacticalPlayed: card.isTactical
            ? prevPlayer.tacticalPlayed + 1
            : prevPlayer.tacticalPlayed,
    };

    const next = {
        ...state,
        [handKey]: updatedPlayer,
        flags: newFlags,
    };

    return finalizeTurn(next, player);
};

export const coreRunDraw = (state, player, deckType) => {
    if (state.pendingAction?.type !== 'DRAW_CARDS') return null;
    if (state.pendingAction.player !== player) return null;

    let drawnCard = null;
    let newTroopDeck = state.troopDeck;
    let newTacticalDeck = state.tacticalDeck;

    if (deckType === 'TROOP' && newTroopDeck.length > 0) {
        newTroopDeck = [...newTroopDeck];
        drawnCard = newTroopDeck.pop();
    } else if (deckType === 'TACTICAL' && newTacticalDeck.length > 0) {
        newTacticalDeck = [...newTacticalDeck];
        drawnCard = newTacticalDeck.pop();
    }

    const handKey = player === 'P1' ? 'p1' : 'p2';
    const handOwner = state[handKey];
    const updatedOwner = drawnCard
        ? { ...handOwner, hand: [...handOwner.hand, drawnCard] }
        : handOwner;

    const next = {
        ...state,
        troopDeck: newTroopDeck,
        tacticalDeck: newTacticalDeck,
        [handKey]: updatedOwner,
        pendingAction: null,
        turn: player === 'P1' ? 'P2' : 'P1',
    };

    // ドロー後にも改めて自動獲得を再評価 (山札枚数変動による証明成立を反映)
    const autoClaimedFlags = next.flags.map(f => {
        if (f.claimedBy) return f;
        const claimer = checkAutoClaimForFlag(f, next.flags);
        return claimer ? { ...f, claimedBy: claimer } : f;
    });

    const finalized = { ...next, flags: autoClaimedFlags };
    const winner = checkWinCondition(finalized.flags);
    if (winner) finalized.status = winner + '_WINS';

    return finalized;
};

// ---- React フックラッパー (ローカル動作/ロビー戻り用) ----

export function useGame() {
    const [state, setState] = useState(getInitialGameState());

    const playCard = (currentState, player, cardIndex, flagIndex) => {
        const newState = corePlayCard(currentState || state, player, cardIndex, flagIndex);
        if (newState && !currentState) setState(newState);
        return newState;
    };

    const runDraw = (currentState, player, deckType) => {
        const newState = coreRunDraw(currentState || state, player, deckType);
        if (newState && !currentState) setState(newState);
        return newState;
    };

    return { state, setState, playCard, runDraw };
}
