// Initial State and State transitions
import { createTroopDeck, createTacticalDeck } from './deck';

export const GAME_STATUS = {
    PLAYING: 'PLAYING',
    WAITING_FOR_SCOUT_RETURN: 'WAITING_FOR_SCOUT_RETURN',
    WAITING_FOR_REDEPLOY_TARGET: 'WAITING_FOR_REDEPLOY_TARGET',
    WAITING_FOR_DESERTER_TARGET: 'WAITING_FOR_DESERTER_TARGET',
    WAITING_FOR_TRAITOR_TARGET: 'WAITING_FOR_TRAITOR_TARGET',
    P1_WINS: 'P1_WINS',
    P2_WINS: 'P2_WINS',
    DRAW: 'DRAW'
};

export function getInitialGameState() {
    let troopDeck = createTroopDeck();
    let tacticalDeck = createTacticalDeck();
    
    // Draw 7 cards for each player
    let p1Hand = [];
    let p2Hand = [];
    for(let i=0; i<7; i++){
        p1Hand.push(troopDeck.pop());
        p2Hand.push(troopDeck.pop());
    }

    // 9 flags
    let flags = Array.from({length: 9}, (_, i) => ({
        id: `flag_${i}`,
        index: i,
        claimedBy: null, // 'P1', 'P2', or null
        p1Cards: [],
        p2Cards: [],
        weatherCard: null // 't_fog', 't_mud', or null
    }));

    return {
        status: GAME_STATUS.PLAYING,
        turn: 'P1', // 'P1' or 'P2'
        troopDeck,
        tacticalDeck,
        p1: {
            hand: p1Hand,
            tacticalPlayed: 0
        },
        p2: {
            hand: p2Hand,
            tacticalPlayed: 0
        },
        flags,
        pendingAction: null, // to store inter-state data like selected card for guile
    };
}
