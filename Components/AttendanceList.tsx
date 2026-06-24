import React from 'react';

interface Player {
  name: string;
  status: 'available' | 'resting' | 'playing' | 'absent';
  queueOrder: number;
}

interface AttendanceListProps {
  players: Player[];
  onToggleRest: (name: string) => void;
  onToggleAttendance: (name: string) => void;
  onCheckOutAll: () => void;
  onDeletePlayer: (name: string) => void;
}

export default function AttendanceList({
  players,
  onToggleRest,
  onToggleAttendance,
  onCheckOutAll,
  onDeletePlayer
}: AttendanceListProps) {
  
  // Split players into Active (Checked-In) and Roster Database (Absent)
  const activePlayers = players.filter(p => p.status !== 'absent');
  const rosterPlayers = players.filter(p => p.status === 'absent');

  // Sort Active players: Resting -> Playing -> Available (then Alphabetical)
  const sortedActive = [...activePlayers].sort((a, b) => {
    const statusPriority: Record<string, number> = {
      resting: 1,
      playing: 2,
      available: 3
    };

    const priorityA = statusPriority[a.status] || 3;
    const priorityB = statusPriority[b.status] || 3;

    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.name.localeCompare(b.name);
  });

  // Sort Roster Database alphabetically
  const sortedRoster = [...rosterPlayers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* 1. ACTIVE PLAYERS LIST */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            Active Players ({activePlayers.length})
          </span>
          {activePlayers.length > 0 && (
            <button 
              type="button"
              onClick={onCheckOutAll}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="overflow-y-auto space-y-1 max-h-[260px] pr-1">
          {sortedActive.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-3 text-center bg-slate-950/20 border border-slate-900 border-dashed rounded-lg">
              No active players. Check members in below!
            </p>
          ) : (
            sortedActive.map((player) => {
              const isResting = player.status === 'resting';
              const isPlaying = player.status === 'playing';

              return (
                <div 
                  key={player.name}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    isPlaying
                      ? 'bg-indigo-950/30 border-indigo-900/50 text-slate-200'
                      : isResting
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-200 shadow-sm shadow-amber-500/5'
                      : 'bg-slate-900 border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-grow">
                    <button
                      type="button"
                      onClick={() => onToggleAttendance(player.name)}
                      className="text-slate-500 hover:text-red-400 p-1 text-xs transition-colors flex-shrink-0 font-bold"
                      title="Check out player (Send to Database)"
                    >
                      ✕
                    </button>
                    <div className="truncate text-sm font-medium">{player.name}</div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isPlaying && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-900/50">
                        ⚔️ Live
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleRest(player.name)}
                      className={`text-[10px] font-bold px-2 py-1 rounded transition-all ${
                        isResting
                          ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black'
                          : isPlaying
                          ? 'bg-slate-950 text-slate-500 hover:text-amber-400 border border-slate-800 hover:border-amber-500/30'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800/80'
                      }`}
                    >
                      ☕ {isResting ? 'Resting' : isPlaying ? 'Rest Next' : 'Rest'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. ROSTER DATABASE LIST */}
      <div className="flex-grow flex flex-col min-h-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
          Roster Database ({sortedRoster.length})
        </span>

        <div className="flex-grow overflow-y-auto space-y-1 max-h-[220px] pr-1">
          {sortedRoster.map((player) => (
            <div 
              key={player.name}
              className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-900/60 rounded-lg text-slate-400 transition-all"
            >
              <div className="truncate text-sm font-medium text-slate-300 mr-2">
                {player.name}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleAttendance(player.name)}
                  className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 text-[10px] font-bold px-2 py-1 rounded transition-all"
                >
                  ➕ Check In
                </button>
                <button
                  type="button"
                  onClick={() => onDeletePlayer(player.name)}
                  className="text-slate-600 hover:text-red-400 p-1 text-sm rounded transition-colors font-bold"
                  title="Delete permanently from database"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}