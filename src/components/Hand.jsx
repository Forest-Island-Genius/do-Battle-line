import React from 'react';
import { Card } from './Card';
import './Hand.css';

export function Hand({ cards, playerName, isMe, isCurrentTurn, onCardClick, selectedCardIndex, faceDown, highlightIndices }) {
    return (
        <div className={`hand-container ${isCurrentTurn ? 'active-turn' : ''}`}>
            <h3 className="player-label">{playerName}{isMe ? ' (あなた)' : ''}</h3>
            <div className="cards-row">
                {cards.map((c, idx) => {
                    const isSelected = selectedCardIndex === idx || highlightIndices?.has?.(idx);
                    return (
                        <div
                            key={idx}
                            className={`hand-card-wrapper ${isSelected ? 'selected' : ''}`}
                            onClick={() => isMe && onCardClick(idx)}
                        >
                            <Card card={c} faceDown={!!faceDown} isSelected={isSelected} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
