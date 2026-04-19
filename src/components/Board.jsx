import React from 'react';
import { Flag } from './Flag';
import './Board.css';

/**
 * Props:
 *  flags
 *  onFlagClick(flagIdx)
 *  onCardClick(flagIdx, side, cardIdx)
 *  flagTargetable    (flag, idx) => { own, opp } | null
 *  destinationHighlight (flag, idx) => boolean
 *  myRole
 */
export function Board({ flags, onFlagClick, onCardClick, flagTargetable, destinationHighlight, myRole }) {
    return (
        <div className="board-container">
            <div className="flags-row">
                {flags.map((f, i) => (
                    <Flag
                        key={f.id}
                        flag={f}
                        myRole={myRole}
                        onFlagClick={() => onFlagClick?.(i)}
                        onCardClick={onCardClick ? (side, cardIdx) => onCardClick(i, side, cardIdx) : null}
                        targetable={flagTargetable ? flagTargetable(f, i) : null}
                        destinationHighlight={destinationHighlight ? destinationHighlight(f, i) : false}
                    />
                ))}
            </div>
        </div>
    );
}
