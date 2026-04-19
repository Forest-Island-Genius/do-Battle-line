import React from 'react';
import { TACTICAL_CARDS } from '../logic/deck';
import './Card.css';

// Firebase に保存済みの古い state でも最新の name/nameJa/descriptionJa を使えるよう
// レンダリング時に id ベースで最新定義をマージする。
function resolveCard(card) {
    if (!card?.isTactical || !card.id) return card;
    const def = TACTICAL_CARDS.find(c => c.id === card.id);
    return def ? { ...card, ...def } : card;
}

export function Card({ card: rawCard, onClick, isSelected, faceDown }) {
    const card = resolveCard(rawCard);

    if (faceDown || !card) {
        return <div className="card face-down" onClick={onClick}></div>;
    }

    const isTactical = card.isTactical;
    const cardClass = `card ${isTactical ? 'tactical' : ''} ${card.color || 'neutral'} ${isSelected ? 'selected' : ''}`;

    const label = card.nameJa || card.name || '';
    const titleAttr = isTactical
        ? `${label}${card.descriptionJa ? ' — ' + card.descriptionJa : ''}`
        : undefined;

    return (
        <div className={cardClass} onClick={onClick} title={titleAttr}>
            <div className="card-top">
                <span className="card-val">{card.value || '★'}</span>
            </div>
            <div className="card-center">
                {isTactical ? (
                    <div className="tactical-name">{label}</div>
                ) : (
                    <div className="troop-icon">⚔</div>
                )}
            </div>
            <div className="card-bottom">
                <span className="card-val">{card.value || '★'}</span>
            </div>

            {isTactical && card.descriptionJa && (
                <div className="card-tooltip" role="tooltip">
                    <div className="card-tooltip-title">{label}</div>
                    <div className="card-tooltip-body">{card.descriptionJa}</div>
                </div>
            )}
        </div>
    );
}
