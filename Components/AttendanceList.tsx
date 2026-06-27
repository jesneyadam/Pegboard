import React from 'react';

interface Player {
  name: string;
  status: 'available' | 'resting' | 'playing' | 'absent';
  queueOrder: number;
}

interface AttendanceListProps {
  players: Player[];
  onToggleAttendance: (name: string) => void;
  onCheckOutAll: () => void;
  onDeletePlayer: (name: string) => void;
}

export default function AttendanceList({
  players,
  onToggleAttendance,
  onCheckOutAll,
  onDeletePlayer
}: AttendanceListProps) {
  
  // Filter for players who are currently signed out (absent)
  const rosterPlayers = players.filter(p => p.status === 'absent');
  const activeCount = players.length - rosterPlayers.length;

  // Sort Roster Database alphabetically
  const sortedRoster = [...rosterPlayers].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* ROSTER DATABASE HEADER */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Available Members ({sortedRoster.length})
        </span>
        {activeCount > 0 && (
          <button 
            type="button"
            onClick={onCheckOutAll}
            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider"
            title="Check out all active players back to database"
          >
            Clear All Active ({activeCount})
          </button>
        )}
      </div>

      {/* ROSTER DATABASE LIST */}
      <div className="flex-grow overflow-y-auto space-y-1 max-h-[500px] pr-1">
        {sortedRoster.length === 0 ? (
          <p className="text-xs text-slate-600 italic py-4 text-center bg-slate-950/20 border border-slate-900 border-dashed rounded-lg">
            All members are checked in!
          </p>
        ) : (
          sortedRoster.map((player) => (
            <div 
              key={player.name}
              className="flex items-center justify-between p-2 bg-slate-950/40 border border-slate-900/60 rounded-lg text-slate-400 transition-all hover:border-slate-800"
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
          ))
        )}
      </div>

    </div>
  );
}