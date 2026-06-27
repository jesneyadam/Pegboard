import React, { useState } from 'react';

interface CourtProps {
  courtNumber: number;
  players: string[];
  status: 'active' | 'empty';
  isFilling?: boolean;
  onClearCourt?: (winners: string[], losers: string[], score: string) => void;
  onRemove?: () => void;
}

export default function Court({  
  courtNumber, 
  players = [], 
  status, 
  isFilling = false,
  onClearCourt, 
  onRemove
}: CourtProps) {
  const [selectedWinners, setSelectedWinners] = useState<string[]>([]);
  const [scoreTeam1, setScoreTeam1] = useState('');
  const [scoreTeam2, setScoreTeam2] = useState('');

  // Compact layout: filters out empty padding strings entirely
  const activePlayers = (players || []).filter(Boolean);
  const actualPlayerCount = activePlayers.length;
  
  // Set required winners dynamically: 2 winners for doubles (4 players), 1 for singles (2 players)
  const requiredWinners = actualPlayerCount === 4 ? 2 : 1;

  // Helper logic to cleanly parse and cap manual score typing at 30
  const handleScoreInputChange = (value: string, setScoreState: React.Dispatch<React.SetStateAction<string>>) => {
    if (value === '') {
      setScoreState('');
      return;
    }
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue)) {
      const cappedValue = Math.min(Math.max(0, numericValue), 30);
      setScoreState(cappedValue.toString());
    }
  };

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
    
    // Fallback if inputs are left entirely blank, otherwise pull values
    let s1 = scoreTeam1;
    let s2 = scoreTeam2;

    // Hard ceiling catch-all block to guarantee maximum validation constraints
    if (s1 && parseInt(s1, 10) > 30) s1 = "30";
    if (s2 && parseInt(s2, 10) > 30) s2 = "30";

    const finalScore = s1 && s2 ? `${s1}-${s2}` : 'XX-XX';

    const winners = activePlayers.filter(p => selectedWinners.includes(p));
    const losers = activePlayers.filter(p => !selectedWinners.includes(p));
    
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
    <div className={`border bg-white rounded-xl shadow-sm overflow-hidden flex flex-col transition-all relative h-auto ${
      isFilling ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/10' : 'border-slate-200'
    }`}>
      {/* Court Header */}
      <div className={`p-3.5 text-center font-bold text-base text-white flex justify-between items-center ${getHeaderBackground()}`}>
        <span>Court {courtNumber}</span>
        
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

      {/* Dynamic Player Grid */}
      {status === 'active' ? (
        <div className="p-3.5 grid grid-cols-2 gap-2 bg-slate-50">
          {activePlayers.map((player, index) => {
            const isUserSelectedWinner = selectedWinners.includes(player);
            const cardStyle = isUserSelectedWinner
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md ring-2 ring-emerald-500/30'
              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

            return (
              <button
                key={index}
                disabled={status !== 'active' || !player}
                onClick={() => handleToggleWinner(player)}
                className={`h-12 flex flex-col items-center justify-center rounded-lg font-medium border text-center transition-all ${cardStyle} ${
                  isUserSelectedWinner ? 'text-slate-900' : 'text-slate-700'
                }`}
              >
                <span className="text-xs font-semibold">{player}</span>
                {player && status === 'active' && (
                  <span className="text-[9px] uppercase font-bold mt-0.5 opacity-80">
                    {isUserSelectedWinner ? '🏆 Winner' : 'Select Winner'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-4 text-center bg-slate-50 text-slate-400 text-xs italic py-6">
          Court is currently empty
        </div>
      )}

      {/* Action Footer */}
      {status === 'active' && (
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-col gap-2.5">
          <div className="flex flex-col gap-2">
            {/* Score Input Lane */}
            <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col gap-1 shadow-sm">
              <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider text-center">Log Final Score</span>
              <div className="flex items-center justify-center gap-2">
                <input 
                  type="number" 
                  min="0" 
                  max="30" 
                  value={scoreTeam1} 
                  onChange={e => handleScoreInputChange(e.target.value, setScoreTeam1)} 
                  placeholder="0" 
                  className="w-12 bg-slate-50 border border-slate-200 rounded text-center text-[11px] py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                />
                <span className="text-slate-400 font-bold text-xs">-</span>
                <input 
                  type="number" 
                  min="0" 
                  max="30"
                  value={scoreTeam2} 
                  onChange={e => handleScoreInputChange(e.target.value, setScoreTeam2)} 
                  placeholder="0" 
                  className="w-12 bg-slate-50 border border-slate-200 rounded text-center text-[11px] py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
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
        </div>
      )}
    </div>
  );
}