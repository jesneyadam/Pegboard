import React, { useState } from 'react';

interface CourtProps {
  courtNumber: number;
  players: string[];
  status: 'active' | 'empty';
  isFilling?: boolean;
  onClearCourt?: (winners: string[], losers: string[], score: string) => void;
  onStartFilling?: () => void;
  onConfirmMatch?: () => void;
  onCancelPicking?: () => void;
  onRemove?: () => void;
}

export default function Court({  
  courtNumber, 
  players, 
  status, 
  isFilling = false,
  onClearCourt, 
  onStartFilling,
  onConfirmMatch,
  onCancelPicking,
  onRemove
}: CourtProps) {
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [scoreTeam1, setScoreTeam1] = useState('');
  const [scoreTeam2, setScoreTeam2] = useState('');

  const displayPlayers = [...players, '', '', '', ''].slice(0, 4);
  const actualPlayerCount = players.filter(Boolean).length;
  
  // Set required winners dynamically: 2 winners for doubles (4 players), 1 for singles (2 players)
  const requiredWinners = actualPlayerCount === 4 ? 2 : 1;

  const handleToggleWinner = (playerName: string) => {
    if (!playerName || status !== 'active') return;
    
    setSelectedWinners(prev => {
      if (prev.includes(playerName)) {
        return prev.filter(name => name !== playerName);
      }
      // If we've reached the limit, swap the newest selection in
      if (prev.length >= requiredWinners) {
        return requiredWinners === 1 ? [playerName] : [prev[1], playerName];
      }
      return [...prev, playerName];
    });
  };

  const handleConfirmScore = () => {
    if (selectedWinners.length !== requiredWinners) return;
    
    // Default fallback scores if left blank
    const finalScore = scoreTeam1 && scoreTeam2 ? `${scoreTeam1}-${scoreTeam2}` : 'XX-XX';

    const winners = players.filter(p => selectedWinners.includes(p));
    const losers = players.filter(p => !selectedWinners.includes(p));
    
    onClearCourt?.(winners, losers, finalScore);
    
    // Reset selections and scores
    setSelectedWinners([]);
    setScoreTeam1('');
    setScoreTeam2('');
  };

  const getHeaderBackground = () => {
    if (isFilling) return 'bg-indigo-600';
    if (status === 'active') return 'bg-emerald-600';
    return 'bg-slate-500';
  };

  return (
    <div className={`border bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full transition-all relative ${
      isFilling ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/10' : 'border-slate-200'
    }`}>
      {/* Court Header */}
      <div className={`p-4 text-center font-bold text-lg text-white flex justify-between items-center ${getHeaderBackground()}`}>
        <span>Court {courtNumber}</span>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="w-5 h-5 rounded bg-black/20 hover:bg-black/40 flex items-center justify-center text-xs text-white font-bold transition-colors"
            title="Remove Court"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50 flex-grow content-center">
        {displayPlayers.map((player, index) => {
          const isUserSelectedWinner = selectedWinners.includes(player);
          let cardStyle = 'bg-white border-slate-300 text-slate-800 shadow-sm';
          
          if (!player) {
            cardStyle = 'bg-slate-100 border-dashed border-slate-300 text-slate-400 text-sm italic';
          } else if (status === 'active') {
            cardStyle = isUserSelectedWinner
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';
          }

          return (
            <button
              key={index}
              disabled={status !== 'active' || !player}
              onClick={() => handleToggleWinner(player)}
              className={`h-14 flex flex-col items-center justify-center rounded-lg font-medium border text-center transition-all ${cardStyle} ${
                isUserSelectedWinner ? 'text-slate-900' : 'text-slate-700'
              }`}
            >
              <span className="text-sm font-semibold">{player || 'Empty'}</span>
              {player && status === 'active' && (
                <span className="text-[9px] uppercase font-bold mt-0.5 opacity-80">
                  {isUserSelectedWinner ? '🏆 Winner' : 'Select Winner'}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex flex-col gap-2">
        {status === 'active' ? (
          <div className="flex flex-col gap-2">
            
            {/* Score Input Lane */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-1 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider text-center">Log Final Score</span>
              <div className="flex items-center justify-center gap-2">
                <input 
                  type="number" 
                  min="0" 
                  value={scoreTeam1} 
                  onChange={e => setScoreTeam1(e.target.value)} 
                  placeholder="0" 
                  className="w-14 bg-slate-50 border border-slate-200 rounded text-center text-xs py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
                <span className="text-slate-400 font-bold">-</span>
                <input 
                  type="number" 
                  min="0" 
                  value={scoreTeam2} 
                  onChange={e => setScoreTeam2(e.target.value)} 
                  placeholder="0" 
                  className="w-14 bg-slate-50 border border-slate-200 rounded text-center text-xs py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
              </div>
            </div>

            {selectedWinners.length === requiredWinners && (
              <button 
                onClick={handleConfirmScore} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg shadow-sm transition-colors animate-fadeIn"
              >
                💾 Confirm Winner(s) & Score
              </button>
            )}
            
            <p className="text-[10px] text-slate-500 text-center font-medium">
              {selectedWinners.length === requiredWinners 
                ? '✓ Ready to log results' 
                : `Select ${requiredWinners} winner(s) from the grid above`}
            </p>
          </div>
        ) : isFilling ? (
          <div className="flex gap-2">
            <button onClick={onCancelPicking} className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-1.5 rounded-md">Cancel</button>
            <button onClick={onConfirmMatch} disabled={players.length < 2} className={`w-2/3 text-xs font-bold py-1.5 rounded-md text-white ${players.length >= 2 ? 'bg-emerald-600' : 'bg-emerald-800/40 text-slate-400 cursor-not-allowed'}`}>Confirm Match</button>
          </div>
        ) : (
          <button onClick={onStartFilling} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1.5 rounded-md">Let Top Player Pick</button>
        )}
      </div>
    </div>
  );
}