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
  matches: MatchRecord[];
}

export default function Home() {
  // ==========================================
  // 1. ALL CORE STATES
  // ==========================================
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
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]); 
  
  const [isAutoDriveActive, setIsAutoDriveActive] = useState(false);
  const [isFairPairingActive, setIsFairPairingActive] = useState(true);
  const isProcessingAutoDrive = useRef(false);

  // ==========================================
  // 2. UTILITIES
  // ==========================================
  const saveToHistory = (
    currAttendance = attendance, 
    currCourts = courts, 
    currCounter = orderCounter, 
    currNums = activeCourtNumbers,
    currStaged = stagedMatch,
    currMatches = matches
  ) => {
    const snapshot: HistorySnapshot = {
      attendance: JSON.parse(JSON.stringify(currAttendance)),
      courts: JSON.parse(JSON.stringify(currCourts)),
      orderCounter: currCounter,
      activeCourtNumbers: [...currNums],
      stagedMatch: [...currStaged],
      matches: JSON.parse(JSON.stringify(currMatches))
    };
    setHistory(prev => [snapshot, ...prev].slice(0, 10));
  };

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

  // ==========================================
  // 3. HANDLERS
  // ==========================================
  const handleUndo = () => {
    if (history.length === 0) return;
    const [nextTargetState, ...remainingHistory] = history;

    setAttendance(nextTargetState.attendance);
    setCourts(nextTargetState.courts);
    setOrderCounter(nextTargetState.orderCounter);
    setActiveCourtNumbers(nextTargetState.activeCourtNumbers);
    setStagedMatch(nextTargetState.stagedMatch || []);
    setMatches(nextTargetState.matches || []);
    localStorage.setItem('b_matches', JSON.stringify(nextTargetState.matches || []));

    setHistory(remainingHistory);
    setSelectedPlayers([]);
  };

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

  const handleToggleRestState = (name: string) => {
    saveToHistory();
    const isStaged = stagedMatch.includes(name);
    const isOnCourt = courts.some(c => c.status === 'active' && c.players.includes(name));

    setAttendance(prev => prev.map(p => {
      if (p.name !== name) return p;
      if (isOnCourt) return { ...p, status: p.status === 'resting' ? 'playing' : 'resting' };
      return { ...p, status: (p.status === 'available' || p.status === 'playing') ? 'resting' : 'available' };
    }));

    if (isStaged) setStagedMatch(prev => prev.filter(pName => pName !== name));
  };

  const handleToggleAttendance = (name: string) => {
    saveToHistory();
    
    const currentMaxOrder = attendance.reduce((max, p) => 
      (p.queueOrder && p.queueOrder !== 999) ? Math.max(max, p.queueOrder) : max, 
      0
    );
    let localCounter = currentMaxOrder + 1;
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

    if (isStaged) setStagedMatch(prev => prev.filter(pName => pName !== name));
    if (selectedPlayers.includes(name)) setSelectedPlayers(prev => prev.filter(n => n !== name));
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

  // Deploys 4 selected players onto a court arranged as perfectly even interleaved teams
  const handleDeployEvenMatch = (courtNum: number) => {
    if (selectedPlayers.length !== 4) return;

    const getDynamicSkill = (playerName: string) => {
      const playerMatches = matches.filter(m => 
        m.winners.includes(playerName) || m.losers.includes(playerName)
      );
      
      if (playerMatches.length === 0) return 1200; 

      let totalPointsDiff = 0;
      playerMatches.forEach(m => {
        const [winStr, loseStr] = m.score.split('-');
        const winPoints = parseInt(winStr, 10) || 21;
        const losePoints = parseInt(loseStr, 10) || 0;
        const diff = winPoints - losePoints;

        if (m.winners.includes(playerName)) {
          totalPointsDiff += diff;
        } else {
          totalPointsDiff -= diff;
        }
      });

      const wins = playerMatches.filter(m => m.winners.includes(playerName)).length;
      const totalMatches = playerMatches.length;

      const confidenceWeight = 4;
      const smoothedWinRate = (wins + (confidenceWeight * 0.5)) / (totalMatches + confidenceWeight);
      const avgPointsDiff = totalPointsDiff / totalMatches;

      return (smoothedWinRate * 100) + (avgPointsDiff * 3);
    };

    // Map players and sort strictly by skill descending (strongest -> weakest)
    const playersWithSkill = selectedPlayers.map(name => ({
      name,
      skill: getDynamicSkill(name)
    })).sort((a, b) => b.skill - a.skill);

    // Explicitly interleave:
    // Team A: [Strongest (0), Weakest (3)]
    // Team B: [Second Strongest (1), Second Weakest (2)]
    const team1 = [playersWithSkill[0], playersWithSkill[3]];
    const team2 = [playersWithSkill[1], playersWithSkill[2]];

    const formattedTeams = [
      `${team1[0].name} & ${team1[1].name}`,
      `${team2[0].name} & ${team2[1].name}`
    ];

    saveToHistory();

    setCourts(prev => prev.map(c => c.courtNumber === courtNum ? { 
      ...c, 
      players: formattedTeams, 
      status: 'active' 
    } : c));
    
    setAttendance(prev => prev.map(p => selectedPlayers.includes(p.name) ? { ...p, status: 'playing' } : p));
    setSelectedPlayers([]);
  };

  const handleClearStagingLane = () => {
    if (stagedMatch.length === 0 || isAutoActiveCheck()) return;
    saveToHistory();
    setAttendance(prev => prev.map(p => stagedMatch.includes(p.name) ? { ...p, status: 'available' } : p));
    setStagedMatch([]);
  };

  const isAutoActiveCheck = () => isAutoDriveActive;

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
    
    const currentMaxOrder = attendance.reduce((max, p) => 
      (p.queueOrder && p.queueOrder !== 999) ? Math.max(max, p.queueOrder) : max, 
      0
    );
    let localCounter = currentMaxOrder + 1;

    if (courtToClear && courtToClear.status === 'active' && courtToClear.players.length > 0) {
      updatedAttendance = attendance.map(p => courtToClear.players.includes(p.name) ? { ...p, status: 'available', queueOrder: localCounter++ } : p);
    }

    saveToHistory(attendance, courts, orderCounter, activeCourtNumbers);

    if (courtToClear && courtToClear.status === 'active' && courtToClear.players.length > 0) {
      setAttendance(updatedAttendance);
      setOrderCounter(localCounter);
    }

    setCourts(prev => prev.filter(c => c.courtNumber !== num));
    setActiveCourtNumbers(prev => prev.filter(n => n !== num));
  };

  const handleAddCourt = () => {
    saveToHistory();
    const nextCourtNum = courts.length + 1;
    
    setCourts(prev => [
      ...prev, 
      { courtNumber: nextCourtNum, players: [], status: 'empty' }
    ]);
    setActiveCourtNumbers(prev => [...prev, nextCourtNum].sort((a, b) => a - b));
  };

  const handleMatchFinished = (courtNumber: number, winners: string[], losers: string[], score: string) => {
    saveToHistory();

    const currentCourt = courts.find(c => c.courtNumber === courtNumber);
    
    // Safely parse individual names, splitting combined team strings (e.g., "A & B") if present
    const extractNames = (playerSlot: string[]) => {
      const flatNames: string[] = [];
      playerSlot.forEach(item => {
        if (item.includes('&')) {
          const splitNames = item.split('&').map(n => n.trim());
          flatNames.push(...splitNames);
        } else {
          flatNames.push(item);
        }
      });
      return flatNames;
    };

    const activePlayersOnCourt = currentCourt ? extractNames(currentCourt.players) : [...winners, ...losers];

    // UNPACK: If fair-pairing strings were used for winners/losers parameters, unpack them to commit INDIVIDUAL match stats
    const flatWinners = extractNames(winners);
    const flatLosers = extractNames(losers);

    const newMatchRecord: MatchRecord = {
      id: Math.random().toString(36).substring(2, 9),
      courtNumber,
      winners: flatWinners, // Commit as individual entities
      losers: flatLosers,   // Commit as individual entities
      score,
      timestamp: Date.now()
    };
    
    setMatches(prev => [...prev, newMatchRecord]);

    const currentMaxOrder = attendance.reduce((max, p) => 
      (p.queueOrder && p.queueOrder !== 999) ? Math.max(max, p.queueOrder) : max, 
      0
    );

    let nextOrder = currentMaxOrder + 1;
    const orderAssignments: { [key: string]: number } = {};
    
    // Winners get assigned sequential queue orders first, placing them strictly above the losers in the list
    const orderedRequeue = [...flatWinners, ...flatLosers];

    orderedRequeue.forEach(name => { 
      orderAssignments[name] = nextOrder++; 
    });

    const updatedAttendance = attendance.map(p => {
      if (activePlayersOnCourt.includes(p.name)) {
        if (p.status === 'resting') return p; 
        return {
          ...p,
          status: 'available' as const,
          queueOrder: orderAssignments[p.name]
        };
      }
      return p;
    });

    let nextCourtPlayers: string[] = [];
    let nextCourtStatus: 'active' | 'empty' = 'empty';
    let remainingStagedMatch = [...stagedMatch];

    if (!isAutoDriveActive) {
      if (remainingStagedMatch.length === 4) {
        nextCourtPlayers = remainingStagedMatch;
        nextCourtStatus = 'active';
        remainingStagedMatch = []; 
      }
    }

    setAttendance(updatedAttendance);
    setOrderCounter(nextOrder);
    setStagedMatch(remainingStagedMatch);
    setCourts(prev => prev.map(c => c.courtNumber === courtNumber ? { ...c, players: nextCourtPlayers, status: nextCourtStatus } : c));
  };

  // ==========================================
  // 4. SYNC EFFECTS
  // ==========================================
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
        { name: 'Adam J', status: 'absent', queueOrder: 999 },
        { name: 'Rob S', status: 'absent', queueOrder: 999 },
        { name: 'Dave O', status: 'absent', queueOrder: 999 },
        { name: 'Dave A', status: 'absent', queueOrder: 999 },
        { name: 'Stephen L', status: 'absent', queueOrder: 999 },
        { name: 'Stephen H', status: 'absent', queueOrder: 999 },
        { name: 'Damien', status: 'absent', queueOrder: 999 },
        { name: 'Ryan', status: 'absent', queueOrder: 999 },
        { name: 'Nayab', status: 'absent', queueOrder: 999 },
        { name: 'Clare', status: 'absent', queueOrder: 999 },
        { name: 'Dan', status: 'absent', queueOrder: 999 },
        { name: 'Aniston', status: 'absent', queueOrder: 999 },
        { name: 'Jebin', status: 'absent', queueOrder: 999 },
        { name: 'Ash', status: 'absent', queueOrder: 999 },
        { name: 'Jarek', status: 'absent', queueOrder: 999 },
        { name: 'Khai', status: 'absent', queueOrder: 999 },
        { name: 'Esmee', status: 'absent', queueOrder: 999 },
        { name: 'Colin', status: 'absent', queueOrder: 999 },
        { name: 'Nigel', status: 'absent', queueOrder: 999 },
        { name: 'Natalie', status: 'absent', queueOrder: 999 },
        { name: 'Kev', status: 'absent', queueOrder: 999 },
        { name: 'Rich', status: 'absent', queueOrder: 999 },
        { name: 'Tom', status: 'absent', queueOrder: 999 },
        { name: 'Charles', status: 'absent', queueOrder: 999 },
        { name: 'Ian', status: 'absent', queueOrder: 999 },
        { name: 'James', status: 'absent', queueOrder: 999 },
        { name: 'Jim', status: 'absent', queueOrder: 999 },
        { name: 'Krishnan', status: 'absent', queueOrder: 999 },
        { name: 'Celia', status: 'absent', queueOrder: 999 },
        { name: 'Rojen', status: 'absent', queueOrder: 999 },
        { name: 'Sam', status: 'absent', queueOrder: 999 },
        { name: 'Vital', status: 'absent', queueOrder: 999 },
        { name: 'Adam H', status: 'absent', queueOrder: 999 },
      ]);
      setOrderCounter(1);
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

  useEffect(() => {
    if (!isHydrated || !isAutoDriveActive || isProcessingAutoDrive.current) return;

    const extractNextAutoPickGroup = (currentQueueList: string[], needed: number = 4): string[] | null => {
      if (currentList.length < 8) return null; 
      const picker = currentList[0];
      const candidates = currentList.slice(1, 8);
      const randomized = [...candidates].sort(() => 0.5 - Math.random());
      return [picker, ...randomized.slice(0, needed - 1)];
    };

    let localAttendance = [...attendance];
    let localCourts = [...courts];
    let localStaged = [...stagedMatch];
    let modified = false;

    let openCourts = localCourts.filter(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty');
    if (openCourts.length > 0 && localStaged.length === 4) {
      const target = openCourts[0];
      localCourts = localCourts.map(c => c.courtNumber === target.courtNumber ? { ...c, players: localStaged, status: 'active' } : c);
      localStaged = [];
      modified = true;
    }

    const getQueue = (att: Player[]) => att
      .filter(p => p.status === 'available' || p.status === 'resting')
      .sort((a, b) => {
        if (a.status === 'available' && b.status === 'resting') return -1;
        if (a.status === 'resting' && b.status === 'available') return 1;
        return a.queueOrder - b.queueOrder;
      })
      .map(p => p.name);

    openCourts = localCourts.filter(c => activeCourtNumbers.includes(c.courtNumber) && c.status === 'empty');
    while (openCourts.length > 0) {
      const activeQueue = getQueue(localAttendance);
      const group = extractNextAutoPickGroup(activeQueue, 4);
      if (!group) break;

      const target = openCourts.shift()!;
      localCourts = localCourts.map(c => c.courtNumber === target.courtNumber ? { ...c, players: group, status: 'active' } : c);
      localAttendance = localAttendance.map(p => group.includes(p.name) ? { ...p, status: 'playing' } : p);
      modified = true;
    }

    if (localStaged.length < 4) {
      const activeQueue = getQueue(localAttendance);
      if (localStaged.length === 0) {
        const group = extractNextAutoPickGroup(activeQueue, 4);
        if (group) {
          localStaged = group;
          localAttendance = localAttendance.map(p => group.includes(p.name) ? { ...p, status: 'playing' } : p);
          modified = true;
        }
      } else if (activeQueue.length > 0) {
        const space = 4 - localStaged.length;
        const filling = activeQueue.slice(0, space);
        localStaged = [...localStaged, ...filling];
        localAttendance = localAttendance.map(p => filling.includes(p.name) ? { ...p, status: 'playing' } : p);
        modified = true;
      }
    }

    if (modified) {
      isProcessingAutoDrive.current = true;
      saveToHistory(localAttendance, localCourts, orderCounter, activeCourtNumbers, localStaged);
      setAttendance(localAttendance);
      setCourts(localCourts);
      setStagedMatch(localStaged);
      setSelectedPlayers([]);
      setTimeout(() => { isProcessingAutoDrive.current = false; }, 30);
    }

  }, [attendance, courts, stagedMatch, isAutoDriveActive, activeCourtNumbers, isHydrated, orderCounter]);

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100">
      <div className="max-w-[1400px] mx-auto">
        
        <header className="mb-6 border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Digital Pegboard</h1>
            <p className="text-slate-400 mt-1">Club Night Court Management</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Fair Pairing ON/OFF Toggle Switch */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-xs">
              <span className="text-slate-400 font-medium">Fair Pairing:</span>
              <button 
                onClick={() => setIsFairPairingActive(!isFairPairingActive)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isFairPairingActive ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span 
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isFairPairingActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`} 
                />
              </button>
              <span className="font-bold text-white w-6">{isFairPairingActive ? 'ON' : 'OFF'}</span>
            </div>

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
          
          {/* Database Panel */}
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

          {/* Staging Lane & Layout Grid */}
          <div className="lg:col-span-6 space-y-4">
            <div className={`border rounded-xl p-4 transition-all ${
              stagedMatch.length > 0 ? 'bg-slate-900 border-indigo-500/40 shadow-md shadow-indigo-500/5' : 'bg-slate-900/60 border-slate-800 border-dashed'
            }`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-2 w-2 rounded-full ${isAutoDriveActive ? 'bg-indigo-400 animate-pulse' : 'bg-amber-500'}`} />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Next Match</h3>
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

            {/* Courts Layout Container */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-200">Courts Layout</h2>
                <button 
                  onClick={handleAddCourt}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-400 font-bold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  ➕ Add Court
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                {courts.map((courtData) => {
                  const num = courtData.courtNumber;
                  const isCourtActive = activeCourtNumbers.includes(num);

                  if (isCourtActive) {
                    return (
                      <div key={num} className="h-auto">
                        <Court 
                          courtNumber={num} 
                          players={courtData.players} 
                          status={courtData.status}
                          isFilling={false} 
                          onClearCourt={(winners, losers, score) => handleMatchFinished(num, winners, losers, score)}
                          onRemove={() => handleDisableCourtSlot(num)}
                        />
                        {/* Render balanced even match button when 4 players are selected AND Fair Pairing is ON */}
                        {selectedPlayers.length === 4 && isFairPairingActive && (
                          <div className="mt-2 bg-indigo-950/40 border border-indigo-800/60 rounded-lg p-2 text-center">
                            <button
                              onClick={() => handleDeployEvenMatch(num)}
                              className="w-full text-xs font-bold text-indigo-300 hover:text-indigo-200 py-1"
                            >
                              ⚖️ Balance 4 Selected into Even Teams
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <button
                      key={num}
                      onClick={() => handleActivateCourtSlot(num)}
                      className="h-32 border-2 border-dashed border-slate-800 bg-slate-900/20 hover:bg-slate-900/60 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 group transition-all"
                    >
                      <span className="text-2xl font-light mb-1 group-hover:scale-110 transition-transform">+</span>
                      <span className="text-xs font-bold uppercase tracking-wider">Activate Court {num}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Waiting Queue Line */}
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
              onToggleRest={handleToggleRestState}
              onToggleAttendance={handleToggleAttendance}
            />
          </div>

        </div>
      </div>
    </main>
  );
}