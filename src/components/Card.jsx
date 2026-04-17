import React from 'react';
import './Card.css';

// Renders a single playing card.
// Props: card { id, color, value, type, isTactical, name }
export function Card({ card, onClick, isSelected, faceDown }) {
    if (faceDown || !card) {
        return <div className="card face-down" onClick={onClick}></div>;
    }

    const isTactical = card.isTactical;
    const cardClass = `card ${isTactical ? 'tactical' : ''} ${card.color || 'neutral'} ${isSelected ? 'selected' : ''}`;

    return (
        <div className={cardClass} onClick={onClick}>
            <div className="card-top">
                <span className="card-val">{card.value || '★'}</span>
            </div>
            <div className="card-center">
                {isTactical ? (
                     <div className="tactical-name">{card.name}</div>
                ) : (
                    <div className="troop-icon">⚔</div>
                )}
            </div>
             <div className="card-bottom">
                <span className="card-val">{card.value || '★'}</span>
            </div>
        </div>
    );
}
