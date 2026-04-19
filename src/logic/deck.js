// Nine Banners — カードデッキと戦術定義
export const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
export const MIN_VALUE = 1;
export const MAX_VALUE = 10;

export const TACTICAL_TYPES = {
    WEATHER: 'WEATHER',
    MORALE: 'MORALE',
    GUILE: 'GUILE'
};

// ID (t_xxx) は内部ロジック用に固定。表示名は Nine Banners 仕様にリネーム。
// leader: Alexander/Darius 相当は 1 プレイヤーあたり生涯 1 枚制限。
export const TACTICAL_CARDS = [
    { id: 't_fog', name: 'Mist of War', nameJa: '戦場の霧', type: TACTICAL_TYPES.WEATHER,
      descriptionJa: 'フラッグの役を無効化し、合計値のみで勝敗を決する。' },
    { id: 't_mud', name: 'Quagmire', nameJa: '泥濘', type: TACTICAL_TYPES.WEATHER,
      descriptionJa: 'フラッグの必要編成枚数を 4 枚に拡張する。' },

    { id: 't_alexander', name: 'Lion Banner', nameJa: '獅子旗', type: TACTICAL_TYPES.MORALE, leader: true,
      descriptionJa: '任意の色・任意の値のワイルド。獅子旗と鷲旗は合わせて生涯 1 枚のみ使用可。' },
    { id: 't_darius', name: 'Eagle Banner', nameJa: '鷲旗', type: TACTICAL_TYPES.MORALE, leader: true,
      descriptionJa: '任意の色・任意の値のワイルド。獅子旗と鷲旗は合わせて生涯 1 枚のみ使用可。' },
    { id: 't_shield', name: 'Shield Wall', nameJa: '盾衛', type: TACTICAL_TYPES.MORALE,
      descriptionJa: '任意の色で値は 1・2・3 のいずれかのワイルド。' },
    { id: 't_companion', name: 'Royal Guard', nameJa: '近衛騎兵', type: TACTICAL_TYPES.MORALE,
      descriptionJa: '任意の色の 8 として扱えるワイルド。' },

    { id: 't_scout', name: 'Outrider', nameJa: '斥候', type: TACTICAL_TYPES.GUILE,
      descriptionJa: '山札から任意の組合せで合計 3 枚を引き、手札から 2 枚を各山札の上に戻す。ドローは発生しない。' },
    { id: 't_redeploy', name: 'Reposition', nameJa: '陣変え', type: TACTICAL_TYPES.GUILE,
      descriptionJa: '自軍の未獲得フラッグ上のカード 1 枚を別の未獲得フラッグへ移動、もしくは捨て札にする。' },
    { id: 't_deserter', name: 'Desertion', nameJa: '脱走', type: TACTICAL_TYPES.GUILE,
      descriptionJa: '敵軍の未獲得フラッグ上のカード 1 枚を捨て札にする。' },
    { id: 't_traitor', name: 'Turncoat', nameJa: '裏切り', type: TACTICAL_TYPES.GUILE,
      descriptionJa: '敵軍の未獲得フラッグ上の部隊カード 1 枚を自軍側の未獲得フラッグへ寝返らせる。' },
];

export function createTroopDeck() {
    let deck = [];
    for (const color of COLORS) {
        for (let i = MIN_VALUE; i <= MAX_VALUE; i++) {
            deck.push({
                type: 'TROOP',
                id: `troop_${color}_${i}`,
                color,
                value: i
            });
        }
    }
    return shuffle(deck);
}

export function createTacticalDeck() {
    // Guile カードも含め全 10 種を採用。
    return shuffle(TACTICAL_CARDS.map(card => ({ ...card, isTactical: true })));
}

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
