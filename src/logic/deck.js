// constants for the game
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
export const MIN_VALUE = 1;
export const MAX_VALUE = 10;

export const TACTICAL_TYPES = {
    WEATHER: 'WEATHER',
    MORALE: 'MORALE', // Or Environment
    GUILE: 'GUILE'    // Or Ploy/Stratagem
};

export const TACTICAL_CARDS = [
    { id: 't_fog', name: 'Fog', nameJa: '霧', type: TACTICAL_TYPES.WEATHER,
      description: 'Disables formations on a flag. Winners are decided by sum of values.',
      descriptionJa: 'フラッグの役を無効化し、合計値のみで勝敗を決する。' },
    { id: 't_mud', name: 'Mud', nameJa: '泥濘', type: TACTICAL_TYPES.WEATHER,
      description: 'Expands the formation size on a flag to 4 cards.',
      descriptionJa: 'フラッグの必要編成枚数を4枚に拡張する。' },
    { id: 't_alexander', name: 'Alexander', nameJa: 'アレクサンドロス', type: TACTICAL_TYPES.MORALE,
      description: 'Acts as a wild card (any color, any number).',
      descriptionJa: '任意の色・任意の値として扱えるワイルドカード。' },
    { id: 't_darius', name: 'Darius', nameJa: 'ダレイオス', type: TACTICAL_TYPES.MORALE,
      description: 'Acts as a wild card (any color, any number).',
      descriptionJa: '任意の色・任意の値として扱えるワイルドカード。' },
    { id: 't_shield', name: 'Shield', nameJa: '盾兵', type: TACTICAL_TYPES.MORALE,
      description: 'Acts as a wild card of value 1, 2, or 3 (any color).',
      descriptionJa: '任意の色で値は 1・2・3 のいずれかのワイルドカード。' },
    { id: 't_companion', name: 'Companion Cavalry', nameJa: '仲間騎兵', type: TACTICAL_TYPES.MORALE,
      description: 'Acts as an 8 of any color.',
      descriptionJa: '任意の色の 8 として扱えるワイルドカード。' },
    { id: 't_scout', name: 'Scout', nameJa: '斥候', type: TACTICAL_TYPES.GUILE,
      description: 'Draw 3 cards from either deck, then return 2 cards to the top of their decks.',
      descriptionJa: '任意の山札から合計3枚引き、そのうち2枚を山札の上に戻す。(未実装)' },
    { id: 't_redeploy', name: 'Redeploy', nameJa: '再配置', type: TACTICAL_TYPES.GUILE,
      description: 'Move one of your troops to another flag or discard it.',
      descriptionJa: '自軍の部隊1枚を別のフラッグへ移動、または捨て札にする。(未実装)' },
    { id: 't_deserter', name: 'Deserter', nameJa: '脱走兵', type: TACTICAL_TYPES.GUILE,
      description: 'Discard one opposing troop card.',
      descriptionJa: '相手の部隊カード1枚を捨て札にする。(未実装)' },
    { id: 't_traitor', name: 'Traitor', nameJa: '裏切り者', type: TACTICAL_TYPES.GUILE,
      description: 'Move one opposing troop card to your side.',
      descriptionJa: '相手の部隊カード1枚を自軍側へ移動する。(未実装)' },
];

export function createTroopDeck() {
    let deck = [];
    for (const color of COLORS) {
        for (let i = MIN_VALUE; i <= MAX_VALUE; i++) {
            deck.push({
                type: 'TROOP',
                id: `troop_${color}_${i}`,
                color: color,
                value: i
            });
        }
    }
    return shuffle(deck);
}

export function createTacticalDeck() {
    // MVP: Weather と Morale のみ採用。Guile (Scout/Redeploy/Deserter/Traitor) は
    // マルチステップの対象選択 UI が未実装のため一旦デッキから除外する。
    let deck = TACTICAL_CARDS
        .filter(card => card.type !== TACTICAL_TYPES.GUILE)
        .map(card => ({ ...card, isTactical: true }));
    return shuffle(deck);
}

// Fisher-Yates shuffle
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    let newArray = [...array];
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
}
