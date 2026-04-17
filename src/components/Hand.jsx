import React from 'react';
import { Card } from './Card';
import './Hand.css';

export function Hand({ cards, playerName, isMe, isCurrentTurn, onCardClick, selectedCardIndex, faceDown }) {
    // faceDown=true  →  相手の手札（常に裏向き）
    // faceDown=false →  自分の手札（常に表向き）
    return (
        <div className={`hand-container ${isCurrentTurn ? 'active-turn' : ''}`}>
            <h3 className="player-label">{playerName}{isMe ? ' (あなた)' : ''}</h3>
            <div className="cards-row">
                {cards.map((c, idx) => (
                    <div 
                        key={idx} 
                        className={`hand-card-wrapper ${selectedCardIndex === idx ? 'selected' : ''}`}
                        onClick={() => isMe && onCardClick(idx)}
                    >
                        <Card card={c} faceDown={!!faceDown} isSelected={selectedCardIndex === idx} />
                    </div>
                ))}
            </div>
        </div>
    );
}

