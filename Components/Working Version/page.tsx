"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Court from '../Components/Court';
import WaitingQueue from '../Components/WaitingQueue';
import AttendanceList from '../Components/AttendanceList';

interface Player {
  name: string;
  status: 'available' | 'resting' | 'playing' | 'absent';
  queueOrder: number;
}

interface CourtState {
  courtNumber: number;
  players: string[];
  status: 'active' | 'empty';
}

interface MatchRecord {
  id: string;
  courtNumber: number;
  winners: string[];
  losers: string[];
  score: string;
  timestamp: number;
}

interface HistorySnapshot {
  attendance: Player[];
  courts: CourtState[];
  orderCounter: number;
  activeCourtNumbers: number[];
  stagedMatch: string[];
}

export default function Home() {
  const [attendance, setAttendance] = useState<Player[]>([]);
  const [orderCounter, setOrderCounter] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);

  const [activeCourtNumbers, setActiveCourtNumbers] = useState<number[]>([1, 2, 3]); 
  const [courts, setCourts] = useState<CourtState[]>([
    { courtNumber: 1, players: [], status: 'empty' },
    { courtNumber: 2, players: [], status: 'empty' },
    { courtNumber: 3, players: [], status: 'empty' },
    { courtNumber: 4, players: [], status: 'empty' },
  ]);

  const [stagedMatch, setStagedMatch] = useState<string[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  
  const [isAutoDriveActive, setIsAutoDriveActive] = useState(false);
  const isProcessingAutoDrive = useRef(false);

  // --- STORAGE SYNCHRONIZERS ---
  useEffect(() => {
    const savedAttendance = localStorage.getItem('b_attendance');
    const savedCourts = localStorage.getItem('b_courts');
    const savedCounter = localStorage.getItem('b_counter');
    const savedActiveNums = localStorage.getItem('b_active_nums');
    const savedHistory = localStorage.getItem('b_history');
    const savedStaged = localStorage.getItem('b_staged');
    const savedMatches = localStorage.getItem('b_matches');
    const savedAutoDrive = localStorage.getItem('b_autodrive');

    if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
    else {
      setAttendance([
        { name: 'Dave', status: 'available', queueOrder: 1 },
        { name: 'Sarah', status: 'available', queueOrder: 2 },
        { name: 'James', status: 'available', queueOrder: 3 },
        { name: 'Emily', status: 'available', queueOrder: 4 },
        { name: 'Alex', status: 'available', queueOrder: 5 },
        { name: 'Chloe', status: 'available', queueOrder: 6 },
        { name: 'Michael', status: 'absent', queueOrder: 999 },
        { name: 'Jessica', status: 'absent', queueOrder: 999 },
        { name: 'Tom', status: 'absent', queueOrder: 999 },
      ]);
      setOrderCounter(7);
    }

    if (savedCourts) setCourts(JSON.parse(savedCourts));
    if (savedCounter) setOrderCounter(parseInt(savedCounter, 10));
    if (savedActiveNums) setActiveCourtNumbers(JSON.parse(savedActiveNums));
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedStaged) setStagedMatch(JSON.parse(savedStaged));
    if (savedMatches) setMatches(JSON.parse(savedMatches));
    if (savedAutoDrive) setIsAutoDriveActive(JSON.parse(savedAutoDrive));

    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem('b_attendance', JSON.stringify(attendance));
    localStorage.setItem('b_courts', JSON.stringify(courts));
    localStorage.setItem('b_counter', orderCounter.toString());
    localStorage.setItem('b_active_nums', JSON.stringify(activeCourtNumbers));
    localStorage.setItem('b_history', JSON.stringify(history));
    localStorage.setItem('b_staged', JSON.stringify(stagedMatch));
    localStorage.setItem('b_matches', JSON.stringify(matches));
    localStorage.setItem('b_autodrive', JSON.stringify(isAutoDriveActive));
  }, [attendance, courts, orderCounter, activeCourtNumbers, history, stagedMatch, matches, isAutoDriveActive, isHydrated]);


  // --- ENGINE UTILITIES ---
  const waitingQueue = attendance
    .filter(p => p.status === 'available' || p.status === 'resting')
    .sort((a, b) => {
      if (a.status === 'available' && b.status === 'resting') return -1;
      if (a.status === 'resting' && b.status === 'available') return 1;
      return a.queueOrder - b.queueOrder;
    })
    .map(p => p.name);

  const emptyActiveCourtNumbers = courts
    .filter(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty')
    .map(c => c.courtNumber);

  const saveToHistory = (
    currAttendance = attendance, 
    currCourts = courts, 
    currCounter = orderCounter, 
    currNums = activeCourtNumbers,
    currStaged = stagedMatch
  ) => {
    const snapshot: HistorySnapshot = {
      attendance: JSON.parse(JSON.stringify(currAttendance)),
      courts: JSON.parse(JSON.stringify(currCourts)),
      orderCounter: currCounter,
      activeCourtNumbers: [...currNums],
      stagedMatch: [...currStaged]
    };
    setHistory(prev => [snapshot, ...prev].slice(0, 10));
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const [nextTargetState, ...remainingHistory] = history;

    setAttendance(nextTargetState.attendance);
    setCourts(nextTargetState.courts);
    setOrderCounter(nextTargetState.orderCounter);
    setActiveCourtNumbers(nextTargetState.activeCourtNumbers);
    setStagedMatch(nextTargetState.stagedMatch || []);
    setHistory(remainingHistory);
    setSelectedPlayers([]);
  };


  // --- SELECTION CONTROL ---
  const handleSelectPlayerFromQueue = (playerName: string) => {
    if (waitingQueue.length === 0 || isAutoDriveActive) return;
    const topPlayer = waitingQueue[0];

    setSelectedPlayers(prev => {
      if (prev.length === 0) {
        if (playerName === topPlayer) return [topPlayer];
        return [topPlayer, playerName];
      }
      if (prev.includes(playerName)) {
        if (playerName === topPlayer) return prev; 
        return prev.filter(n => n !== playerName);
      }
      if (prev.length >= 4) return prev;
      return [...prev, playerName];
    });
  };


  // --- AUTO-DRIVE BACKGROUND ENGINE LOOP ---
  useEffect(() => {
    if (!isHydrated || !isAutoDriveActive || isProcessingAutoDrive.current) return;

    const extractNextAutoPickGroup = (currentQueueList: string[], countNeeded: number = 4): string[] | null => {
      if (currentQueueList.length < 8) return null; 
      
      const pickerCandidate = currentQueueList[0];
      const surroundingCandidates = currentQueueList.slice(1, 8);
      const randomizedPool = [...surroundingCandidates].sort(() => 0.5 - Math.random());
      
      return [pickerCandidate, ...randomizedPool.slice(0, countNeeded - 1)];
    };

    let localAttendance = [...attendance];
    let localCourts = [...courts];
    let localStagedMatch = [...stagedMatch];
    let stateModified = false;

    // 1. Send fully staged match to court if one is empty
    let openCourts = localCourts.filter(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty');
    if (openCourts.length > 0 && localStagedMatch.length === 4) {
      const targetCourt = openCourts[0];
      localCourts = localCourts.map(c => c.courtNumber === targetCourt.courtNumber ? { ...c, players: localStagedMatch, status: 'active' } : c);
      localStagedMatch = [];
      stateModified = true;
    }

    const getWorkingQueue = (workingAttendance: Player[]) => {
      return workingAttendance
        .filter(p => p.status === 'available' || p.status === 'resting')
        .sort((a, b) => {
          if (a.status === 'available' && b.status === 'resting') return -1;
          if (a.status === 'resting' && b.status === 'available') return 1;
          return a.queueOrder - b.queueOrder;
        })
        .map(p => p.name);
    };

    // 2. Clear out any open empty courts directly from queue first
    openCourts = localCourts.filter(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty');
    while (openCourts.length > 0) {
      const activeQueue = getWorkingQueue(localAttendance);
      const generatedMatchGroup = extractNextAutoPickGroup(activeQueue, 4);

      if (!generatedMatchGroup) break;

      const targetCourt = openCourts.shift()!;
      localCourts = localCourts.map(c => c.courtNumber === targetCourt.courtNumber ? { ...c, players: generatedMatchGroup, status: 'active' } : c);
      localAttendance = localAttendance.map(p => generatedMatchGroup.includes(p.name) ? { ...p, status: 'playing' } : p);
      stateModified = true;
    }

    // 3. Fill or rebuild incomplete/empty staging lane slots
    if (localStagedMatch.length < 4) {
      const activeQueue = getWorkingQueue(localAttendance);
      
      if (localStagedMatch.length === 0) {
        const generatedMatchGroup = extractNextAutoPickGroup(activeQueue, 4);
        if (generatedMatchGroup) {
          localStagedMatch = generatedMatchGroup;
          localAttendance = localAttendance.map(p => generatedMatchGroup.includes(p.name) ? { ...p, status: 'playing' } : p);
          stateModified = true;
        }
      } 
      else if (activeQueue.length > 0) {
        const spacesToFill = 4 - localStagedMatch.length;
        const fillingCandidates = activeQueue.slice(0, spacesToFill);
        
        localStagedMatch = [...localStagedMatch, ...fillingCandidates];
        localAttendance = localAttendance.map(p => fillingCandidates.includes(p.name) ? { ...p, status: 'playing' } : p);
        stateModified = true;
      }
    }

    if (stateModified) {
      isProcessingAutoDrive.current = true;
      saveToHistory();
      setAttendance(localAttendance);
      setCourts(localCourts);
      setStagedMatch(localStagedMatch);
      setSelectedPlayers([]);
      setTimeout(() => { isProcessingAutoDrive.current = false; }, 50);
    }

  }, [attendance, courts, stagedMatch, isAutoDriveActive, activeCourtNumbers, isHydrated]);


  // --- CORE MASTER ROSTER TOGGLES & HANDLERS ---

  const handleToggleRestState = (name: string) => {
    saveToHistory();
    
    const isStaged = stagedMatch.includes(name);
    const isOnCourt = courts.some(c => c.status === 'active' && c.players.includes(name));

    setAttendance(prev => prev.map(p => {
      if (p.name !== name) return p;
      
      // If playing live on court, flag to 'resting' without losing their current position
      if (isOnCourt) {
        return {
          ...p,
          status: p.status === 'resting' ? 'playing' : 'resting'
        };
      }

      // Normal toggle if available or waiting on deck
      const currentIsAvailableOrStaged = p.status === 'available' || p.status === 'playing';
      return {
        ...p,
        status: currentIsAvailableOrStaged ? 'resting' : 'available'
      };
    }));

    // Instantly pull them if they were waiting on deck
    if (isStaged) {
      setStagedMatch(prev => prev.filter(pName => pName !== name));
    }
  };

  const handleToggleAttendance = (name: string) => {
    saveToHistory();
    let localCounter = orderCounter;
    const isStaged = stagedMatch.includes(name);

    setAttendance(prev => prev.map(p => {
      if (p.name !== name) return p;
      const transitioningToHere = p.status === 'absent';
      return {
        ...p,
        status: transitioningToHere ? 'available' : 'absent',
        queueOrder: transitioningToHere ? localCounter++ : 999
      };
    }));

    if (isStaged) {
      setStagedMatch(prev => prev.filter(pName => pName !== name));
    }
    if (selectedPlayers.includes(name)) {
      setSelectedPlayers(prev => prev.filter(n => n !== name));
    }
    setOrderCounter(localCounter);
  };

  const handleDeletePlayer = (name: string) => {
    saveToHistory();
    setAttendance(prev => prev.filter(p => p.name !== name));
    setSelectedPlayers(prev => prev.filter(n => n !== name));
    setStagedMatch(prev => prev.filter(n => n !== name));
    setCourts(prev => prev.map(c => ({ ...c, players: c.players.filter(n => n !== name) })));
  };

  const handleDeployToStaging = () => {
    if (selectedPlayers.length < 2 || stagedMatch.length > 0 || isAutoDriveActive) return;
    saveToHistory();

    setStagedMatch(selectedPlayers);
    setAttendance(prev => prev.map(p => selectedPlayers.includes(p.name) ? { ...p, status: 'playing' } : p));
    setSelectedPlayers([]);

    const freeCourt = courts.find(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty');
    if (freeCourt) {
      setCourts(prev => prev.map(c => c.courtNumber === freeCourt.courtNumber ? { ...c, players: selectedPlayers, status: 'active' } : c));
      setStagedMatch([]); 
    }
  };

  const handleDeployDirectlyToCourt = (courtNum: number) => {
    if (selectedPlayers.length < 2 || isAutoDriveActive) return;
    saveToHistory();

    setCourts(prev => prev.map(c => c.courtNumber === courtNum ? { ...c, players: selectedPlayers, status: 'active' } : c));
    setAttendance(prev => prev.map(p => selectedPlayers.includes(p.name) ? { ...p, status: 'playing' } : p));
    setSelectedPlayers([]);
  };

  const handleClearStagingLane = () => {
    if (stagedMatch.length === 0 || isAutoDriveActive) return;
    saveToHistory();
    setAttendance(prev => prev.map(p => stagedMatch.includes(p.name) ? { ...p, status: 'available' } : p));
    setStagedMatch([]);
  };

  const handleCheckOutAllMembers = () => {
    saveToHistory();
    setIsAutoDriveActive(false);
    setAttendance(prev => prev.map(p => ({ ...p, status: 'absent', queueOrder: 999 })));
    setCourts(prev => prev.map(c => ({ ...c, players: [], status: 'empty' })));
    setStagedMatch([]);
    setSelectedPlayers([]);
    setOrderCounter(1);
  };

  const handleAddPlayerToMasterRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPlayerName.trim();
    if (!clean || attendance.some(p => p.name.toLowerCase() === clean.toLowerCase())) return;
    
    saveToHistory();
    setAttendance(prev => [...prev, { name: clean, status: 'absent', queueOrder: 999 }]); 
    setNewPlayerName('');
  };

  const handleActivateCourtSlot = (num: number) => {
    saveToHistory();
    setActiveCourtNumbers(prev => [...prev, num].sort((a, b) => a - b));

    if (stagedMatch.length > 0) {
      setCourts(prev => prev.map(c => c.courtNumber === num ? { ...c, players: stagedMatch, status: 'active' } : c));
      setStagedMatch([]);
    }
  };

  const handleDisableCourtSlot = (num: number) => {
    const courtToClear = courts.find(c => c.courtNumber === num);
    let updatedAttendance = [...attendance];
    let localCounter = orderCounter;

    if (courtToClear && courtToClear.status === 'active' && courtToClear.players.length > 0) {
      updatedAttendance = attendance.map(p => courtToClear.players.includes(p.name) ? { ...p, status: 'available', queueOrder: localCounter++ } : p);
    }

    saveToHistory(attendance, courts, orderCounter, activeCourtNumbers);

    if (courtToClear && courtToClear.status === 'active' && courtToClear.players.length > 0) {
      setAttendance(updatedAttendance);
      setOrderCounter(localCounter);
    }

    setCourts(prev => prev.map(c => c.courtNumber === num ? { ...c, players: [], status: 'empty' } : c));
    setActiveCourtNumbers(prev => prev.filter(n => n !== num));
  };

  const handleMatchFinished = (courtNumber: number, winners: string[], losers: string[], score: string) => {
    saveToHistory();

    const newMatchRecord: MatchRecord = {
      id: Math.random().toString(36).substring(2, 9),
      courtNumber,
      winners,
      losers,
      score,
      timestamp: Date.now()
    };
    setMatches(prev => [...prev, newMatchRecord]);

    let localCounter = orderCounter;
    const procW = winners.map(name => ({ name, queueOrder: localCounter++ }));
    const procL = losers.map(name => ({ name, queueOrder: localCounter++ }));
    const merged = [...procW, ...procL];
    const names = merged.map(p => p.name);

    const updatedAttendance = attendance.map(p => {
      if (names.includes(p.name)) {
        // Safe check: If flagged as resting while live, do not append to line queue
        if (p.status === 'resting') {
          return p; 
        }
        return {
          ...p,
          status: 'available' as const,
          queueOrder: merged.find(m => m.name === p.name)!.queueOrder
        };
      }
      return p;
    });

    let nextCourtPlayers: string[] = [];
    let nextCourtStatus: 'active' | 'empty' = 'empty';
    let remainingStagedMatch = [...stagedMatch];

    if (remainingStagedMatch.length === 4) {
      nextCourtPlayers = remainingStagedMatch;
      nextCourtStatus = 'active';
      remainingStagedMatch = []; 
    }

    setAttendance(updatedAttendance);
    setOrderCounter(localCounter);
    setStagedMatch(remainingStagedMatch);
    setCourts(prev => prev.map(c => c.courtNumber === courtNumber ? { ...c, players: nextCourtPlayers, status: nextCourtStatus } : c));
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-6 border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Digital Pegboard</h1>
            <p className="text-slate-400 mt-1">Club Night Court Management</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/analytics" className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5">
              📊 Analytics & Leaderboard
            </Link>
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
                history.length > 0 ? 'bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 border-amber-500/30' : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-40'
              }`}
            >
              <span>⎌</span> Undo Last Action ({history.length})
            </button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-900/40 text-xs font-bold px-3 py-2 rounded-lg">
              Reset Session
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Attendance Column */}
          <div className="lg:col-span-3">
            <div className="border border-slate-800 bg-slate-900 rounded-xl p-4 h-full flex flex-col">
              <h2 className="text-lg font-bold text-white mb-4 pb-2 border-b border-slate-800">Attendance Database</h2>
              <form onSubmit={handleAddPlayerToMasterRoster} className="flex gap-2 mb-4">
                <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} placeholder="Add new member..." className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 flex-grow focus:outline-none focus:border-indigo-500" />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 rounded-lg">Add</button>
              </form>
              
              <AttendanceList 
                players={attendance} 
                onToggleRest={handleToggleRestState} 
                onToggleAttendance={handleToggleAttendance}
                onCheckOutAll={handleCheckOutAllMembers}
                onDeletePlayer={handleDeletePlayer}
              />
            </div>
          </div>

          {/* Center Column */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Staging Lane Visual Box */}
            <div className={`border rounded-xl p-4 transition-all ${
              stagedMatch.length > 0 ? 'bg-slate-900 border-indigo-500/40 shadow-md shadow-indigo-500/5' : 'bg-slate-900/60 border-slate-800 border-dashed'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-2 w-2 rounded-full ${isAutoDriveActive ? 'bg-indigo-400 animate-pulse' : 'bg-amber-500'}`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Next Match On Deck</h3>
                </div>
                {stagedMatch.length > 0 && !isAutoDriveActive && (
                  <button onClick={handleClearStagingLane} className="text-[10px] uppercase font-bold text-slate-500 hover:text-red-400">
                    Cancel / Clear Staging
                  </button>
                )}
              </div>

              {stagedMatch.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {stagedMatch.map((name) => (
                    <div key={name} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center flex items-center justify-center min-h-[48px]">
                      <p className="text-sm font-semibold text-white truncate">{name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-500 italic">
                  {isAutoDriveActive ? "Waiting for enough players to fill queue..." : "No match lined up. Tap names in the queue to build the next game!"}
                </div>
              )}
            </div>

            {/* Courts Grid Layout */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-200">Courts Layout</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((num) => {
                  const isCourtActive = activeCourtNumbers.includes(num);
                  const courtData = courts.find(c => c.courtNumber === num)!;

                  if (isCourtActive) {
                    return (
                      <div key={num} className="h-[400px]">
                        <Court 
                          courtNumber={num} 
                          players={courtData.players} 
                          status={courtData.status}
                          isFilling={false} 
                          onClearCourt={(winners, losers, score) => handleMatchFinished(num, winners, losers, score)}
                          onRemove={() => handleDisableCourtSlot(num)}
                        />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={num}
                      onClick={() => handleActivateCourtSlot(num)}
                      className="h-[400px] border-2 border-dashed border-slate-800 bg-slate-900/20 hover:bg-slate-900/60 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 group transition-all"
                    >
                      <span className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform">+</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Open Court {num}</span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Queue Column */}
          <div className="lg:col-span-3">
            <WaitingQueue 
              queue={waitingQueue} 
              selectedPlayers={selectedPlayers} 
              onSelectPlayer={handleSelectPlayerFromQueue} 
              rawPlayers={attendance}
              onSendToStaging={handleDeployToStaging}
              onSendToDirectCourt={handleDeployDirectlyToCourt}
              availableEmptyCourts={emptyActiveCourtNumbers}
              onClearSelection={() => setSelectedPlayers([])}
              isAutoDriveActive={isAutoDriveActive}
              onToggleAutoDrive={() => setIsAutoDriveActive(!isAutoDriveActive)}
            />
          </div>

        </div>
      </div>
    </main>
  );
}