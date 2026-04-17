import React from 'react';
import { Card } from './Card';
import './Flag.css';

export function Flag({ flag, onFlagClick, isP1Turn, myRole }) {
    // flag = { id, index, claimedBy, p1Cards, p2Cards, weatherCard }
    const isP1 = myRole === 'P1';
    const bottomCards = (isP1 ? flag.p1Cards : flag.p2Cards) || [];
    const topCards = (isP1 ? flag.p2Cards : flag.p1Cards) || [];
    const bottomRole = isP1 ? 'P1' : 'P2';
    const topRole = isP1 ? 'P2' : 'P1';

    let captureClass = 'unclaimed';
    if (flag.claimedBy) {
        captureClass = flag.claimedBy === myRole ? 'won-bottom' : 'won-top';
    }

    return (
        <div className="flag-column" onClick={onFlagClick}>
            {/* Top Side (Opponent) */}
            <div className="flag-cards top-cards">
                {topCards.map((c, i) => (
                    <div className="flag-card-slot" key={`${topRole}-${i}`}>
                        <Card card={c} />
                    </div>
                ))}
            </div>

            {/* The Flag Indicator itself */}
            <div className={`flag-token ${captureClass}`}>
                {flag.claimedBy ? flag.claimedBy : flag.index + 1}
                {flag.weatherCard && <div className="weather-mod">{flag.weatherCard === 't_mud' ? 'MUD' : 'FOG'}</div>}
            </div>

            {/* Bottom Side (Me) */}
            <div className="flag-cards bottom-cards">
                 {bottomCards.map((c, i) => (
                    <div className="flag-card-slot" key={`${bottomRole}-${i}`}>
                        <Card card={c} />
                    </div>
                ))}
            </div>
        </div>
    );
}

