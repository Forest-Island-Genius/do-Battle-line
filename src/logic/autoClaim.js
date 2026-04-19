import { evaluateCards, resolveFullFlag } from './evaluation';
import { COLORS, MIN_VALUE, MAX_VALUE } from './deck';

function getVisibleCardsOnBoard(flags) {
    const visible = [];
    flags.forEach(f => {
        f.p1Cards.forEach(c => { if (c.type === 'TROOP') visible.push(c); });
        f.p2Cards.forEach(c => { if (c.type === 'TROOP') visible.push(c); });
    });
    return visible;
}

function getRemainingTroopPool(visible) {
    const remaining = [];
    for (const color of COLORS) {
        for (let v = MIN_VALUE; v <= MAX_VALUE; v++) {
            if (!visible.some(c => c.color === color && c.value === v)) {
                remaining.push({ color, value: v, type: 'TROOP', isTactical: false, id: `troop_${color}_${v}` });
            }
        }
    }
    return remaining;
}

function combinations(arr, k) {
    if (k === 0) return [[]];
    const result = [];
    (function backtrack(start, combo) {
        if (combo.length === k) { result.push([...combo]); return; }
        for (let i = start; i < arr.length; i++) {
            combo.push(arr[i]); backtrack(i + 1, combo); combo.pop();
        }
    })(0, []);
    return result;
}

function bestPossibleEvaluation(currentCards, pool, requiredSize) {
    const isMud = requiredSize === 4;
    const needed = requiredSize - currentCards.length;
    if (needed === 0) return evaluateCards(currentCards, isMud) || { rank: 0, sum: 0 };
    if (needed < 0) return { rank: 0, sum: 0 };

    let best = { rank: 0, sum: 0 };
    for (const extra of combinations(pool, needed)) {
        const ev = evaluateCards([...currentCards, ...extra], isMud);
        if (!ev) continue;
        if (ev.rank > best.rank || (ev.rank === best.rank && ev.sum > best.sum)) best = ev;
    }
    return best;
}

/**
 * フラッグが数学的に獲得可能か判定する。
 * - 両者フル: resolveFullFlag でタイブレーク (firstCompletedBy) 込みで解決
 * - 片側フル: 未知カードプール全探索で「相手が到達可能な最高形」を上回るなら獲得
 */
export function checkAutoClaimForFlag(flag, allFlags) {
    if (flag.claimedBy) return flag.claimedBy;

    const requiredSize = flag.weatherCard === 't_mud' ? 4 : 3;
    const isFog = flag.weatherCard === 't_fog';

    const p1Full = flag.p1Cards.length === requiredSize;
    const p2Full = flag.p2Cards.length === requiredSize;

    if (p1Full && p2Full) return resolveFullFlag(flag);
    if (!p1Full && !p2Full) return null;

    const unknownPool = getRemainingTroopPool(getVisibleCardsOnBoard(allFlags));

    if (p1Full) {
        const p1Ev = evaluateCards(flag.p1Cards, requiredSize === 4);
        const p2Best = bestPossibleEvaluation(flag.p2Cards, unknownPool, requiredSize);
        if (isFog) {
            // P1 sum > any reachable P2 sum
            if (p1Ev.sum > p2Best.sum) return 'P1';
            // ここで sum 同値 = P1 が先完成なので勝ち
            if (p1Ev.sum === p2Best.sum && flag.firstCompletedBy === 'P1') return 'P1';
            return null;
        }
        if (p1Ev.rank > p2Best.rank) return 'P1';
        if (p1Ev.rank === p2Best.rank) {
            if (p1Ev.sum > p2Best.sum) return 'P1';
            if (p1Ev.sum === p2Best.sum && flag.firstCompletedBy === 'P1') return 'P1';
        }
        return null;
    }

    // p2Full only
    const p2Ev = evaluateCards(flag.p2Cards, requiredSize === 4);
    const p1Best = bestPossibleEvaluation(flag.p1Cards, unknownPool, requiredSize);
    if (isFog) {
        if (p2Ev.sum > p1Best.sum) return 'P2';
        if (p2Ev.sum === p1Best.sum && flag.firstCompletedBy === 'P2') return 'P2';
        return null;
    }
    if (p2Ev.rank > p1Best.rank) return 'P2';
    if (p2Ev.rank === p1Best.rank) {
        if (p2Ev.sum > p1Best.sum) return 'P2';
        if (p2Ev.sum === p1Best.sum && flag.firstCompletedBy === 'P2') return 'P2';
    }
    return null;
}
