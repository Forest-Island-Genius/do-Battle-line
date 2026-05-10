export const FORMATIONS = {
    WEDGE:      { rank: 5, name: 'Wedge' },
    PHALANX:    { rank: 4, name: 'Phalanx' },
    BATTALION:  { rank: 3, name: 'Battalion' },
    SKIRMISHER: { rank: 2, name: 'Skirmisher' },
    HOST:       { rank: 1, name: 'Host' }
};

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

export function evaluateCards(cards, isMud = false) {
    const size = isMud ? 4 : 3;
    if (cards.length !== size) return null;

    const nonWilds = cards.filter(c => !c.isTactical || c.type !== 'MORALE');
    const wilds    = cards.filter(c => c.isTactical && c.type === 'MORALE');

    let bestEval = { rank: 0, sum: 0 };

    function getPossibleReplacements(wild) {
        const options = [];
        if (wild.id === 't_alexander' || wild.id === 't_darius') {
            for (const c of COLORS) for (let v = 1; v <= 10; v++) options.push({ color: c, value: v });
        } else if (wild.id === 't_shield') {
            for (const c of COLORS) for (let v = 1; v <= 3; v++) options.push({ color: c, value: v });
        } else if (wild.id === 't_companion') {
            for (const c of COLORS) options.push({ color: c, value: 8 });
        }
        return options;
    }

    function search(index, current) {
        if (index === wilds.length) {
            const res = evaluateConcrete(current);
            if (!res) return;
            if (res.rank > bestEval.rank || (res.rank === bestEval.rank && res.sum > bestEval.sum)) {
                bestEval = res;
            }
            return;
        }
        for (const opt of getPossibleReplacements(wilds[index])) {
            search(index + 1, [...current, opt]);
        }
    }

    if (wilds.length === 0) return evaluateConcrete(cards);

    search(0, nonWilds);
    return bestEval;
}

function evaluateConcrete(cards) {
    const values = cards.map(c => c.value).sort((a, b) => a - b);
    const colors = cards.map(c => c.color);
    const sum    = values.reduce((a, b) => a + b, 0);

    const isFlush  = new Set(colors).size === 1;
    const isSameValue = new Set(values).size === 1; // 3-of-a-kind / 4-of-a-kind (Mud)
    let isStraight = true;
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) { isStraight = false; break; }
    }

    let formation = FORMATIONS.HOST;
    if (isFlush && isStraight) formation = FORMATIONS.WEDGE;
    else if (isSameValue)      formation = FORMATIONS.PHALANX;
    else if (isFlush)          formation = FORMATIONS.BATTALION;
    else if (isStraight)       formation = FORMATIONS.SKIRMISHER;

    return { rank: formation.rank, name: formation.name, sum };
}

// 両者完成済みフラッグで勝敗を決める (フォーカス: タイブレーク = 先に完成させた側)
// returns 'P1' | 'P2' | null
export function resolveFullFlag(flag) {
    const isMud = flag.weatherCard === 't_mud';
    const isFog = flag.weatherCard === 't_fog';
    const requiredSize = isMud ? 4 : 3;

    if (flag.p1Cards.length !== requiredSize || flag.p2Cards.length !== requiredSize) return null;

    const p1 = evaluateCards(flag.p1Cards, isMud);
    const p2 = evaluateCards(flag.p2Cards, isMud);

    if (isFog) {
        if (p1.sum > p2.sum) return 'P1';
        if (p2.sum > p1.sum) return 'P2';
        return flag.firstCompletedBy; // 公式: 先に完成させた側が勝つ
    }

    if (p1.rank > p2.rank) return 'P1';
    if (p2.rank > p1.rank) return 'P2';
    if (p1.sum > p2.sum) return 'P1';
    if (p2.sum > p1.sum) return 'P2';
    return flag.firstCompletedBy;
}
