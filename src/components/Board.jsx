import React from 'react';
import { Flag } from './Flag';
import './Board.css';

export function Board({ flags, onFlagClick, currentPlayer, myRole }) {
    return (
        <div className="board-container">
            <div className="flags-row">
                {flags.map((f, i) => (
                    <Flag 
                        key={f.id} 
                        flag={f} 
                        onFlagClick={() => onFlagClick(i)} 
                        isP1Turn={currentPlayer === 'P1'}
                        myRole={myRole}
                    />
                ))}
            </div>
        </div>
    );
}

