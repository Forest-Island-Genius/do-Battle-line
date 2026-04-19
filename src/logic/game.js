// 初期状態と遷移定義
import { createTroopDeck, createTacticalDeck } from './deck';

export const GAME_STATUS = {
    PLAYING: 'PLAYING',
    P1_WINS: 'P1_WINS',
    P2_WINS: 'P2_WINS',
    DRAW: 'DRAW'
};

export function getInitialGameState() {
    let troopDeck = createTroopDeck();
    let tacticalDeck = createTacticalDeck();

    let p1Hand = [];
    let p2Hand = [];
    for (let i = 0; i < 7; i++) {
        p1Hand.push(troopDeck.pop());
        p2Hand.push(troopDeck.pop());
    }

    // 9 fronts (flags). firstCompletedBy は編成を先に完成させた側の記録 (同値タイブレーク用)。
    const flags = Array.from({ length: 9 }, (_, i) => ({
        id: `flag_${i}`,
        index: i,
        claimedBy: null,
        p1Cards: [],
        p2Cards: [],
        weatherCard: null,       // 't_fog' | 't_mud' | null
        firstCompletedBy: null   // 'P1' | 'P2' | null
    }));

    return {
        status: GAME_STATUS.PLAYING,
        turn: Math.random() < 0.5 ? 'P1' : 'P2', // 先手はランダム (公式: ディーラーでない側)
        troopDeck,
        tacticalDeck,
        p1: {
            hand: p1Hand,
            tacticalPlayed: 0,
            leaderPlayed: false  // Lion Banner / Eagle Banner は合わせて 1 枚まで
        },
        p2: {
            hand: p2Hand,
            tacticalPlayed: 0,
            leaderPlayed: false
        },
        flags,
        pendingAction: null
    };
}
