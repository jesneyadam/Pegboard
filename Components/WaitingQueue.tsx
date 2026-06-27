import React from 'react';

interface WaitingQueueProps {
  queue: string[];
  selectedPlayers: string[];
  onSelectPlayer: (name: string) => void;
  rawPlayers: { name: string; status: string }[]; // Keeps wide string compatibility
  onSendToStaging: () => void;
  onSendToDirectCourt: (courtNum: number) => void;
  availableEmptyCourts: number[];
  onClearSelection: () => void;
  isAutoDriveActive?: boolean;
  onToggleAutoDrive?: () => void;
  isFairPairingActive?: boolean;
  onToggleFairPairing?: () => void;
  onToggleRest: (name: string) => void;
  onToggleAttendance: (name: string) => void;
}

export default function WaitingQueue({
  queue,
  selectedPlayers,
  onSelectPlayer,
  rawPlayers,
  onSendToStaging,
  onSendToDirectCourt,
  availableEmptyCourts,
  onClearSelection,
  isAutoDriveActive = false,
  onToggleAutoDrive,
  isFairPairingActive = false,
  onToggleFairPairing,
  onToggleRest,
  onToggleAttendance
}: WaitingQueueProps) {
  
  return (
    <div className="border border-slate-800 bg-slate-900 rounded-xl p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
        <h2 className="text-lg font-bold text-white">Waiting Queue</h2>
        <span className="bg-slate-800 text-slate-300 font-mono text-xs px-2 py-0.5 rounded-md font-bold">
          {queue.length} In Line
        </span>
      </div>

      {/* Auto-Drive Toggle Switch Controls */}
      {onToggleAutoDrive && (
        <div className="mb-3">
          <button
            onClick={onToggleAutoDrive}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-between transition-all ${
              isAutoDriveActive
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 ring-1 ring-indigo-400/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isAutoDriveActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>🤖 Auto-Drive Mode</span>
            </div>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider ${
              isAutoDriveActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-500'
            }`}>
              {isAutoDriveActive ? 'ON' : 'OFF'}
            </span>
          </button>
          {isAutoDriveActive && (
            <p className="text-[10px] text-indigo-400 italic text-center mt-1">
              Automation active: Board will auto-fill courts & staging lanes!
            </p>
          )}
        </div>
      )}

      {/* Fair Pairing Toggle Switch Controls */}
      {onToggleFairPairing && (
        <div className="mb-4">
          <button
            onClick={onToggleFairPairing}
            className={`w-full py-2.5 px-3 rounded-lg font-bold text-xs flex items-center justify-between transition-all ${
              isFairPairingActive
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30'
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isFairPairingActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span>⚖️ Auto-Balance Matches</span>
            </div>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-black tracking-wider ${
              isFairPairingActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-900 text-slate-500'
            }`}>
              {isFairPairingActive ? 'ON' : 'OFF'}
            </span>
          </button>
          {isFairPairingActive && (
            <p className="text-[10px] text-emerald-400 italic text-center mt-1">
              Balancing even teams automatically enabled!
            </p>
          )}
        </div>
      )}

      {/* Manual Deployment Panel */}
      {!isAutoDriveActive && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-2.5 mb-3 flex flex-col gap-2 min-h-[116px]">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Selected ({selectedPlayers.length}/4)</span>
            {selectedPlayers.length > 0 && (
              <button onClick={onClearSelection} className="hover:text-red-400 underline">Clear</button>
            )}
          </div>
          
          {/* Selected Badges Area */}
          <div className="flex flex-wrap gap-1 min-h-[24px] items-center">
            {selectedPlayers.length === 0 ? (
              <span className="text-[10px] text-slate-600 italic">Select players below...</span>
            ) : (
              selectedPlayers.map(p => (
                <span key={p} className="bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded">
                  {p}
                </span>
              ))
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-1 mt-1">
            {selectedPlayers.length === 4 && availableEmptyCourts.length > 0 ? (
              <button 
                onClick={() => onSendToDirectCourt(availableEmptyCourts[0])}
                className="flex-grow bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1.5 rounded shadow-sm transition-all"
              >
                Send to Court {availableEmptyCourts[0]}
              </button>
            ) : (
              <button 
                onClick={onSendToStaging}
                disabled={selectedPlayers.length < 2}
                className={`flex-grow text-[10px] font-bold py-1.5 rounded transition-all ${
                  selectedPlayers.length >= 2
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-600 border border-slate-800/50 cursor-not-allowed'
                }`}
              >
                Send to Staging
              </button>
            )}
          </div>
        </div>
      )}

      {/* List Queue */}
      <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 max-h-[520px]">
        {queue.length === 0 ? (
          <p className="text-center text-xs text-slate-600 italic py-8">Queue is empty</p>
        ) : (
          queue.map((name, index) => {
            const isSelected = selectedPlayers.includes(name);
            const isTopPlayer = index === 0;
            const playerObj = rawPlayers.find(p => p.name === name);
            const isResting = playerObj?.status === 'resting';

            return (
              <div
                key={name}
                className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300 ring-1 ring-indigo-500/20 shadow-sm'
                    : isTopPlayer
                    ? 'bg-slate-800/60 border-slate-700 text-slate-200 font-medium'
                    : isResting
                    ? 'bg-slate-900/40 border-slate-800 border-dashed text-slate-500'
                    : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:border-slate-700'
                }`}
              >
                {/* Clickable Name Target Area */}
                <button
                  type="button"
                  disabled={isAutoDriveActive}
                  onClick={() => onSelectPlayer(name)}
                  className={`flex items-center gap-2 min-w-0 flex-grow text-left py-1 ${
                    isAutoDriveActive ? 'cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <span className={`text-[10px] font-mono font-bold w-4 text-center flex-shrink-0 ${
                    isSelected ? 'text-indigo-400' : isTopPlayer ? 'text-amber-400' : 'text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm truncate">{name}</span>
                  
                  {isTopPlayer && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider flex-shrink-0 ml-1">
                      ☝️ Picker
                    </span>
                  )}
                </button>
                
                {/* Action Controls Section */}
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {/* Rest Status Trigger */}
                  <button
                    type="button"
                    onClick={() => onToggleRest(name)}
                    className={`text-[10px] font-bold px-2 py-1 rounded transition-all border ${
                      isResting
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-black'
                        : 'bg-slate-950 text-slate-400 hover:text-amber-400 border-slate-800 hover:border-amber-500/20'
                    }`}
                  >
                    ☕ {isResting ? 'Resting' : 'Rest'}
                  </button>

                  {/* Checkout Trigger */}
                  <button
                    type="button"
                    onClick={() => onToggleAttendance(name)}
                    className="text-slate-500 hover:text-red-400 p-1 text-xs transition-colors font-bold border border-transparent hover:border-slate-800 rounded bg-slate-950/40 h-6 w-6 flex items-center justify-center"
                    title="Check out player"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
        <p><span className="text-amber-400 font-bold">☝️ #1 Spot</span> = Picker (Pulls players)</p>
        <p><span className="text-slate-400 font-bold">☕ Resting</span> = Can be selected but keeps spot</p>
      </div>
    </div>
  );
}