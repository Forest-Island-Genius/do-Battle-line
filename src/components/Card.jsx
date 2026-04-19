import React from 'react';
import './Card.css';

// Renders a single playing card.
// Props: card { id, color, value, type, isTactical, name, nameJa, descriptionJa }
export function Card({ card, onClick, isSelected, faceDown }) {
    if (faceDown || !card) {
        return <div className="card face-down" onClick={onClick}></div>;
    }

    const isTactical = card.isTactical;
    const cardClass = `card ${isTactical ? 'tactical' : ''} ${card.color || 'neutral'} ${isSelected ? 'selected' : ''}`;

    const tooltipTitle = isTactical
        ? `${card.nameJa || card.name}${card.descriptionJa ? ' — ' + card.descriptionJa : ''}`
        : undefined;

    return (
        <div className={cardClass} onClick={onClick} title={tooltipTitle}>
            <div className="card-top">
                <span className="card-val">{card.value || '★'}</span>
            </div>
            <div className="card-center">
                {isTactical ? (
                    <div className="tactical-name">{card.nameJa || card.name}</div>
                ) : (
                    <div className="troop-icon">⚔</div>
                )}
            </div>
            <div className="card-bottom">
                <span className="card-val">{card.value || '★'}</span>
            </div>

            {isTactical && card.descriptionJa && (
                <div className="card-tooltip" role="tooltip">
                    <div className="card-tooltip-title">{card.nameJa || card.name}</div>
                    <div className="card-tooltip-body">{card.descriptionJa}</div>
                </div>
            )}
        </div>
    );
}
