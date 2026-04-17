import { useState } from 'react';
import { getInitialGameState } from './game';
import { checkWinCondition } from './winCheck';
import { checkAutoClaimForFlag } from './autoClaim';

// PURE LOGIC FUNCTIONS (for multiplayer sync)

export const corePlayCard = (state, player, cardIndex, flagIndex) => {
    if (state.status !== 'PLAYING') return null;
    if (state.turn !== player) return null;
    if (state.pendingAction) return null;

    let newState = { ...state };
    let p1Hand = [...newState.p1.hand];
    let p2Hand = [...newState.p2.hand];
    let hand = player === 'P1' ? p1Hand : p2Hand;
    let card = hand[cardIndex];

    if (card.isTactical) {
        let p1T = newState.p1.tacticalPlayed;
        let p2T = newState.p2.tacticalPlayed;
        if (player === 'P1' && p1T > p2T) return null; 
        if (player === 'P2' && p2T > p1T) return null;
    }

    let newFlags = newState.flags.map(f => ({ ...f, p1Cards: [...f.p1Cards], p2Cards: [...f.p2Cards] }));
    let flag = newFlags[flagIndex];

    if (flag.claimedBy) return null; 

    const requiredSize = flag.weatherCard === 't_mud' ? 4 : 3;
    if (player === 'P1') {
        if (flag.p1Cards.length >= requiredSize) return null;
        flag.p1Cards.push(card);
    } else {
        if (flag.p2Cards.length >= requiredSize) return null;
        flag.p2Cards.push(card);
    }
    
    hand.splice(cardIndex, 1);
    if (player === 'P1') {
        newState.p1 = { ...newState.p1, hand: p1Hand, tacticalPlayed: card.isTactical ? newState.p1.tacticalPlayed + 1 : newState.p1.tacticalPlayed };
    } else {
        newState.p2 = { ...newState.p2, hand: p2Hand, tacticalPlayed: card.isTactical ? newState.p2.tacticalPlayed + 1 : newState.p2.tacticalPlayed };
    }
    
    newState.flags = newFlags;
    
    if(newState.troopDeck.length === 0 && newState.tacticalDeck.length === 0) {
         newState.turn = player === 'P1' ? 'P2' : 'P1';
         newState.flags = newState.flags.map(f => {
             if (f.claimedBy) return f;
             let claimer = checkAutoClaimForFlag(f, newState.flags);
             if (claimer) return { ...f, claimedBy: claimer };
             return f;
         });
         let winner = checkWinCondition(newState.flags);
         if(winner) newState.status = winner + '_WINS';
    } else {
         newState.pendingAction = { type: 'DRAW_CARDS', player };
    }

    return newState;
};

export const coreRunDraw = (state, player, deckType) => {
    if (state.pendingAction?.type !== 'DRAW_CARDS' || state.pendingAction.player !== player) return null;

    let newState = { ...state };
    let drawnCard = null;
    if (deckType === 'TROOP' && newState.troopDeck.length > 0) {
        let deck = [...newState.troopDeck];
        drawnCard = deck.pop();
        newState.troopDeck = deck;
    } else if (deckType === 'TACTICAL' && newState.tacticalDeck.length > 0) {
        let deck = [...newState.tacticalDeck];
        drawnCard = deck.pop();
        newState.tacticalDeck = deck;
    }

    if (drawnCard) {
        if (player === 'P1') newState.p1 = { ...newState.p1, hand: [...newState.p1.hand, drawnCard] };
        else newState.p2 = { ...newState.p2, hand: [...newState.p2.hand, drawnCard] };
    }

    newState.pendingAction = null;
    newState.turn = player === 'P1' ? 'P2' : 'P1';

    newState.flags = newState.flags.map(f => {
         if (f.claimedBy) return f;
         let claimer = checkAutoClaimForFlag(f, newState.flags);
         if (claimer) return { ...f, claimedBy: claimer };
         return f;
    });

    let winner = checkWinCondition(newState.flags);
    if(winner) newState.status = winner + '_WINS';

    return newState;
};

// REACT HOOK WRAPPER (for local play)

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
