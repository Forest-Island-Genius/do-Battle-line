import React from 'react';
import { Card } from './Card';
import './Flag.css';

/**
 * Props:
 *  flag
 *  onFlagClick()                 フラッグ全体クリック (通常プレイ時のカード配置確定 or Guile 目的地)
 *  onCardClick(side, cardIdx)    フラッグ上の既存カードクリック (Guile で対象選択)
 *  targetable                    { own, opp } — どちら側のカードが選択可能か
 *  destinationHighlight          boolean — 目的地としてハイライト
 *  myRole                        'P1' | 'P2'
 */
export function Flag({ flag, onFlagClick, onCardClick, targetable, destinationHighlight, myRole }) {
    const isP1 = myRole === 'P1';
    const bottomCards = (isP1 ? flag.p1Cards : flag.p2Cards) || [];
    const topCards    = (isP1 ? flag.p2Cards : flag.p1Cards) || [];
    const bottomRole  = isP1 ? 'P1' : 'P2';
    const topRole     = isP1 ? 'P2' : 'P1';

    let captureClass = 'unclaimed';
    if (flag.claimedBy) {
        captureClass = flag.claimedBy === myRole ? 'won-bottom' : 'won-top';
    }

    const targetableOwn = !!targetable?.own && !flag.claimedBy;
    const targetableOpp = !!targetable?.opp && !flag.claimedBy;

    const columnClass = [
        'flag-column',
        destinationHighlight && !flag.claimedBy ? 'flag-destination-hl' : '',
        targetable ? 'flag-targeting' : ''
    ].filter(Boolean).join(' ');

    const handleCardClick = (side, idx) => (e) => {
        e.stopPropagation();
        if (!onCardClick) return;
        if (side === bottomRole && !targetableOwn) return;
        if (side === topRole    && !targetableOpp) return;
        onCardClick(side, idx);
    };

    return (
        <div className={columnClass} onClick={onFlagClick}>
            <div className="flag-cards top-cards">
                {topCards.map((c, i) => (
                    <div
                        className={`flag-card-slot ${targetableOpp ? 'slot-targetable' : ''}`}
                        key={`${topRole}-${i}`}
                        onClick={handleCardClick(topRole, i)}
                    >
                        <Card card={c} />
                    </div>
                ))}
            </div>

            <div className={`flag-token ${captureClass}`}>
                {flag.claimedBy ? flag.claimedBy : flag.index + 1}
                {flag.weatherCard && (
                    <div className="weather-mod">
                        {flag.weatherCard === 't_mud' ? '泥濘' : '霧'}
                    </div>
                )}
            </div>

            <div className="flag-cards bottom-cards">
                {bottomCards.map((c, i) => (
                    <div
                        className={`flag-card-slot ${targetableOwn ? 'slot-targetable' : ''}`}
                        key={`${bottomRole}-${i}`}
                        onClick={handleCardClick(bottomRole, i)}
                    >
                        <Card card={c} />
                    </div>
                ))}
            </div>
        </div>
    );
}
