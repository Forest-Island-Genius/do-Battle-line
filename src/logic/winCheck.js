import { GAME_STATUS } from './game';
import { TACTICAL_TYPES } from './deck';

export function checkWinCondition(flags) {
    let p1Wins = 0;
    let p2Wins = 0;
    let p1Consecutive = 0;
    let p2Consecutive = 0;
    let maxP1Consecutive = 0;
    let maxP2Consecutive = 0;

    for (let i = 0; i < flags.length; i++) {
        if (flags[i].claimedBy === 'P1') {
            p1Wins++;
            p1Consecutive++;
            p2Consecutive = 0;
            if (p1Consecutive > maxP1Consecutive) maxP1Consecutive = p1Consecutive;
        } else if (flags[i].claimedBy === 'P2') {
            p2Wins++;
            p2Consecutive++;
            p1Consecutive = 0;
            if (p2Consecutive > maxP2Consecutive) maxP2Consecutive = p2Consecutive;
        } else {
            p1Consecutive = 0;
            p2Consecutive = 0;
        }
    }

    if (p1Wins >= 5 || maxP1Consecutive >= 3) return 'P1';
    if (p2Wins >= 5 || maxP2Consecutive >= 3) return 'P2';
    return null;
}

export function playCardReducer(state, action) {
    // Basic structural reducer for playing a card
    // action: { type: 'PLAY_CARD', payload: { player: 'P1', card: {}, flagIndex: 0 } }
    
    // In actual implementation, we'd handle the very complex tactical card states here.
    return { ...state };
}

// To manage the complexities, we'll build a hook in App.jsx that holds the main state 
// and exposes simple dispatch methods for UI interactions (Play Card on Flag X, Draw from Y, etc).
