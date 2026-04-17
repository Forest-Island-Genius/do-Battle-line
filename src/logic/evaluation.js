export const FORMATIONS = {
    WEDGE: { rank: 5, name: 'Wedge' },     // Straight flush
    PHALANX: { rank: 4, name: 'Phalanx' }, // Three of a kind
    BATTALION: { rank: 3, name: 'Battalion' }, // Flush
    SKIRMISHER: { rank: 2, name: 'Skirmisher' }, // Straight
    HOST: { rank: 1, name: 'Host' } // High card
};

// Evaluate exactly 3 cards (or 4, if Mud is played on flag)
export function evaluateCards(cards, isMud = false) {
    let size = isMud ? 4 : 3;
    if (cards.length !== size) return null; // Not full

    // Need to handle wildcards.
    // Wildcards: t_alexander (any, any), t_darius (any, any), t_shield (any color, 1/2/3), t_companion (any color, 8)
    let nonWilds = cards.filter(c => !c.isTactical || (c.isTactical && c.type !== 'MORALE'));
    let wilds = cards.filter(c => c.isTactical && c.type === 'MORALE');

    // To find the best possible formation, we will generate all possible combinations for the wild cards
    // This is computationally small enough (max 2 wilds, ~60 possible states each)
    let bestEval = { rank: 0, sum: 0 };

    function getPossibleReplacements(wild) {
        let options = [];
        const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
        if (wild.id === 't_alexander' || wild.id === 't_darius') {
            for (let c of colors) {
                for (let v = 1; v <= 10; v++) options.push({ color: c, value: v, isWild: true });
            }
        } else if (wild.id === 't_shield') {
            for (let c of colors) {
                for (let v = 1; v <= 3; v++) options.push({ color: c, value: v, isWild: true });
            }
        } else if (wild.id === 't_companion') {
            for (let c of colors) {
                options.push({ color: c, value: 8, isWild: true });
            }
        }
        return options;
    }

    function checkCombination(currentIndex, currentCards) {
        if (currentIndex === wilds.length) {
            let res = evaluateConcrete(currentCards, isMud);
            if (res.rank > bestEval.rank || (res.rank === bestEval.rank && res.sum > bestEval.sum)) {
                bestEval = res;
            }
            return;
        }

        let wildOpts = getPossibleReplacements(wilds[currentIndex]);
        for (let opt of wildOpts) {
            checkCombination(currentIndex + 1, [...currentCards, opt]);
        }
    }

    if (wilds.length === 0) {
        return evaluateConcrete(cards, isMud);
    } else {
        checkCombination(0, nonWilds);
        return bestEval;
    }
}

function evaluateConcrete(cards, isMud) {
    let values = cards.map(c => c.value).sort((a, b) => a - b);
    let colors = cards.map(c => c.color);
    let sum = values.reduce((a, b) => a + b, 0);

    let isFlush = new Set(colors).size === 1;
    let isStraight = true;
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) {
            isStraight = false;
            break;
        }
    }
    let isThreeOfAKind = new Set(values).size === 1; // Works for 4 mostly if we want same logic

    let formation = FORMATIONS.HOST;

    if (isFlush && isStraight) formation = FORMATIONS.WEDGE;
    else if (isThreeOfAKind) formation = FORMATIONS.PHALANX;
    else if (isFlush) formation = FORMATIONS.BATTALION;
    else if (isStraight) formation = FORMATIONS.SKIRMISHER;

    return { rank: formation.rank, name: formation.name, sum };
}

// Compare two sides. returns 'P1', 'P2', or null (tie or unfinished)
// whoCompletedFirst: 'P1', 'P2', or null. In Battle Line, whoever finishes the formation *first* wins ties.
export function compareFlag(flag, whoCompletedFirst) {
    let requiredSize = flag.weatherCard === 't_mud' ? 4 : 3;
    let isFog = flag.weatherCard === 't_fog';

    let p1Full = flag.p1Cards.length === requiredSize;
    let p2Full = flag.p2Cards.length === requiredSize;

    if (!p1Full || !p2Full) return null; // Can't definitively claim unless we implement perfect information engine. For MVP, require both full or explicit claim action.

    let p1Eval = evaluateCards(flag.p1Cards, flag.weatherCard === 't_mud');
    let p2Eval = evaluateCards(flag.p2Cards, flag.weatherCard === 't_mud');

    if (isFog) {
        if (p1Eval.sum > p2Eval.sum) return 'P1';
        if (p2Eval.sum > p1Eval.sum) return 'P2';
        return whoCompletedFirst;
    }

    if (p1Eval.rank > p2Eval.rank) return 'P1';
    if (p2Eval.rank > p1Eval.rank) return 'P2';

    if (p1Eval.sum > p2Eval.sum) return 'P1';
    if (p2Eval.sum > p1Eval.sum) return 'P2';

    return whoCompletedFirst;
}
