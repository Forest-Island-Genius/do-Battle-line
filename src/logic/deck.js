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
    { id: 't_fog', name: 'Fog', type: TACTICAL_TYPES.WEATHER, description: 'Disables formations on a flag. Winners are decided by sum of values.' },
    { id: 't_mud', name: 'Mud', type: TACTICAL_TYPES.WEATHER, description: 'Expands the formation size on a flag to 4 cards.' },
    { id: 't_alexander', name: 'Alexander', type: TACTICAL_TYPES.MORALE, description: 'Acts as a wild card (any color, any number).' },
    { id: 't_darius', name: 'Darius', type: TACTICAL_TYPES.MORALE, description: 'Acts as a wild card (any color, any number).' },
    { id: 't_shield', name: 'Shield', type: TACTICAL_TYPES.MORALE, description: 'Acts as a wild card of value 1, 2, or 3 (any color).' },
    { id: 't_companion', name: 'Companion Cavalry', type: TACTICAL_TYPES.MORALE, description: 'Acts as an 8 of any color.' },
    { id: 't_scout', name: 'Scout', type: TACTICAL_TYPES.GUILE, description: 'Draw 3 cards from either deck, then return 2 cards to the top of their decks.' },
    { id: 't_redeploy', name: 'Redeploy', type: TACTICAL_TYPES.GUILE, description: 'Move one of your troops to another flag or discard it.' },
    { id: 't_deserter', name: 'Deserter', type: TACTICAL_TYPES.GUILE, description: 'Discard one opposing troop card.' },
    { id: 't_traitor', name: 'Traitor', type: TACTICAL_TYPES.GUILE, description: 'Move one opposing troop card to your side.' },
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
    let deck = TACTICAL_CARDS.map(card => ({ ...card, isTactical: true }));
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
