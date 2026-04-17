import { evaluateCards } from './evaluation';
import { COLORS, MIN_VALUE, MAX_VALUE } from './deck';

/**
 * Returns array of all troop cards that are publicly visible on any flag.
 * This ensures we ONLY use board-level public information.
 */
function getVisibleCardsOnBoard(flags) {
    let visible = [];
    flags.forEach(f => {
        f.p1Cards.forEach(c => { if(c.type === 'TROOP') visible.push(c); });
        f.p2Cards.forEach(c => { if(c.type === 'TROOP') visible.push(c); });
    });
    return visible;
}

/**
 * Generates all troop cards that are NOT visible on the board.
 * These are the cards that "could" still be in hands or in the deck.
 */
function getRemainingTroopPool(visibleCards) {
    let remaining = [];
    for (const color of COLORS) {
        for (let v = MIN_VALUE; v <= MAX_VALUE; v++) {
            let isVisible = visibleCards.some(c => c.color === color && c.value === v);
            if (!isVisible) {
                remaining.push({ color, value: v, type: 'TROOP', isTactical: false, id: `troop_${color}_${v}` });
            }
        }
    }
    return remaining;
}

/**
 * Simple combination generator.
 */
function getCombinations(arr, k) {
    if (k === 0) return [[]];
    let result = [];
    function backtrack(start, combo) {
        if (combo.length === k) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]);
            backtrack(i + 1, combo);
            combo.pop();
        }
    }
    backtrack(0, []);
    return result;
}

/**
 * Calculates the absolute best possible formation a side could make given their current cards 
 * and the remaining deck pool (publicly unknown cards).
 */
function getBestPossibleEvaluation(currentCards, remainingPool, requiredSize = 3) {
    let needed = requiredSize - currentCards.length;
    if (needed === 0) return evaluateCards(currentCards);
    if (needed < 0) return { rank: 0, sum: 0 };
    
    // Theoretical max search. 
    // We ignore tactical cards here as per user request.
    let bestEval = { rank: 0, sum: 0 };

    // Heuristic: If we need cards, we only consider the best possible cards in the pool.
    // However, to be mathematically certain, we should check combinations.
    // If pool is very large (e.g. 50 cards), 50C3 is fine.
    let possibleCompletions = getCombinations(remainingPool, needed);
    
    for (let extraCards of possibleCompletions) {
        let testHand = [...currentCards, ...extraCards];
        let currentEval = evaluateCards(testHand);
        if (currentEval.rank > bestEval.rank || (currentEval.rank === bestEval.rank && currentEval.sum > bestEval.sum)) {
            bestEval = currentEval;
        }
    }
    return bestEval;
}

/**
 * Evaluates a single flag to see if someone has mathematically claimed it.
 * Strictly uses board-public troop information only.
 */
export function checkAutoClaimForFlag(flag, allFlags) {
    if (flag.claimedBy) return flag.claimedBy;

    const requiredSize = flag.weatherCard === 't_mud' ? 4 : 3;
    const isFog = flag.weatherCard === 't_fog';
    
    const p1Full = flag.p1Cards.length === requiredSize;
    const p2Full = flag.p2Cards.length === requiredSize;

    // Both full: immediate evaluation
    if (p1Full && p2Full) {
        const p1Eval = evaluateCards(flag.p1Cards);
        const p2Eval = evaluateCards(flag.p2Cards);
        
        if (isFog) {
            if (p1Eval.sum > p2Eval.sum) return 'P1';
            if (p2Eval.sum > p1Eval.sum) return 'P2';
            return null; // Tie handling (in Battle Line, first to complete usually wins ties)
        }

        if (p1Eval.rank > p2Eval.rank) return 'P1';
        if (p2Eval.rank > p1Eval.rank) return 'P2';
        if (p1Eval.sum > p2Eval.sum) return 'P1';
        if (p2Eval.sum > p1Eval.sum) return 'P2';
        return null;
    }

    // Proof of Winning: Only if at least one side is full
    if (!p1Full && !p2Full) return null;

    const visibleOnBoard = getVisibleCardsOnBoard(allFlags);
    const unknownPool = getRemainingTroopPool(visibleOnBoard);

    if (p1Full) {
        const p1Eval = evaluateCards(flag.p1Cards);
        // Can P2 ever beat this p1Eval given current board and unknown pool?
        const bestP2Possible = getBestPossibleEvaluation(flag.p2Cards, unknownPool, requiredSize);
        
        if (isFog) {
            if (p1Eval.sum >= bestP2Possible.sum) return 'P1'; // Wins on sum or tie (completed first)
            return null;
        }
        
        if (p1Eval.rank > bestP2Possible.rank) return 'P1';
        if (p1Eval.rank === bestP2Possible.rank && p1Eval.sum >= bestP2Possible.sum) return 'P1';
    } 
    
    if (p2Full) {
        const p2Eval = evaluateCards(flag.p2Cards);
        // Can P1 ever beat this p2Eval?
        const bestP1Possible = getBestPossibleEvaluation(flag.p1Cards, unknownPool, requiredSize);
        
        if (isFog) {
            if (p2Eval.sum >= bestP1Possible.sum) return 'P2';
            return null;
        }
        
        if (p2Eval.rank > bestP1Possible.rank) return 'P2';
        if (p2Eval.rank === bestP1Possible.rank && p2Eval.sum >= bestP1Possible.sum) return 'P2';
    }

    return null;
}
