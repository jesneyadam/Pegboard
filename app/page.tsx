"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Court from '../Components/Court';
import WaitingQueue from '../Components/WaitingQueue';
import AttendanceList from '../Components/AttendanceList';

interface Player {
  name: string;
  gender: 'male' | 'female';
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

const extractNextAutoPickGroup = (currentQueueList: string[], count: number = 4): string[] | null => {
  if (currentQueueList.length < 4) return null;
  const picker = currentQueueList[0];
  const surrounding = currentQueueList.slice(1, Math.min(8, currentList.length));
  const randomized = [...surrounding].sort(() => 0.5 - Math.random());
  return [picker, ...randomized.slice(0, count - 1)];
};

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
  const [newPlayerGender, setNewPlayerGender] = useState<'male' | 'female'>('male');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [matches, setMatches] = useState<MatchRecord[]>([]); 
  
  const [isAutoDriveActive, setIsAutoDriveActive] = useState(false);
  const [isFairPairingActive, setIsFairPairingActive] = useState(true);
  const isProcessingAutoDrive = useRef(false);

  // ==========================================
  // 1.5. STATE REFS (For stable Auto-Drive loop)
  // ==========================================
  const attendanceRef = useRef(attendance);
  const courtsRef = useRef(courts);
  const stagedMatchRef = useRef(stagedMatch);
  const activeCourtNumsRef = useRef(activeCourtNumbers);
  const isAutoActiveRef = useRef(isAutoDriveActive);
  const isFairPairingRef = useRef(isFairPairingActive);

  useEffect(() => {
    attendanceRef.current = attendance;
    courtsRef.current = courts;
    stagedMatchRef.current = stagedMatch;
    activeCourtNumsRef.current = activeCourtNumbers;
    isAutoActiveRef.current = isAutoDriveActive;
    isFairPairingRef.current = isFairPairingActive;
  }, [attendance, courts, stagedMatch, activeCourtNumbers, isAutoDriveActive, isFairPairingActive]);

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

  const handleDrawStrongGame = () => {
    if (waitingQueue.length < 4 || isAutoDriveActive || stagedMatch.length > 0) return;
    saveToHistory();

    const picker = waitingQueue[0];
    const remainingCandidates = waitingQueue.slice(1);

    const rankedCandidates = remainingCandidates.map(name => ({
      name,
      skill: getDynamicSkill(name)
    })).sort((a, b) => b.skill - a.skill);

    const topEight = rankedCandidates.slice(0, 8);
    const shuffledTopEight = [...topEight].sort(() => 0.5 - Math.random());
    const randomOpponents = shuffledTopEight.slice(0, 3).map(p => p.name);

    const strongGroup = [picker, ...randomOpponents];

    setStagedMatch(strongGroup);
    setAttendance(prev => prev.map(p => strongGroup.includes(p.name) ? { ...p, status: 'playing' } : p));
  };

  const handleMoveStagedToCourt = (courtNum: number) => {
    if (stagedMatch.length === 0) return;
    saveToHistory();

    setCourts(prev => prev.map(c => c.courtNumber === courtNum ? { ...c, players: stagedMatch, status: 'active' } : c));
    setStagedMatch([]);
  };

  const handleMoveStagedEvenMatch = (courtNum: number) => {
    if (stagedMatch.length !== 4) return;

    const playersWithSkill = stagedMatch.map(name => ({
      name,
      skill: getDynamicSkill(name)
    })).sort((a, b) => b.skill - a.skill);

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
    
    setStagedMatch([]);
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
    setStagedMatch(prev => prev.filter(p => p !== name));
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

  const handleDeployEvenMatch = (courtNum: number) => {
    if (selectedPlayers.length !== 4) return;

    const playersWithSkill = selectedPlayers.map(name => ({
      name,
      skill: getDynamicSkill(name)
    })).sort((a, b) => b.skill - a.skill);

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
    if (stagedMatch.length === 0 || isAutoCheckActive()) return;
    saveToHistory();
    setAttendance(prev => prev.map(p => stagedMatch.includes(p.name) ? { ...p, status: 'available' } : p));
    setStagedMatch([]);
  };

  const isAutoCheckActive = () => isAutoDriveActive;

  const handleCheckOutAllMembers = () => {
    saveToHistory();
    setIsAutoDriveActive(false);
    setAttendance(prev => prev.map(p => ({ ...p, status: 'absent', queueOrder: 999 })));
    setCourts(prev => prev.map(c => ({ ...c, players: [], status: 'empty' })));
    setStagedMatch([]);
    setSelectedPlayers([]);
    setOrderCounter(1);
  };

  const addPlayerToMasterRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPlayerName.trim();
    if (!clean || attendance.some(p => p.name.toLowerCase() === clean.toLowerCase())) return;
    
    saveToHistory();
    setAttendance(prev => [...prev, { name: clean, gender: newPlayerGender, status: 'absent', queueOrder: 999 }]); 
    setNewPlayerName('');
    setNewPlayerGender('male');
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

    // UPDATE: Set status to 'empty' and clear players while preserving slot array integrity
    setCourts(prev => prev.map(c => c.courtNumber === num ? { ...c, players: [], status: 'empty' } : c));
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

    const flatWinners = extractNames(winners);
    const flatLosers = extractNames(losers);

    const newMatchRecord: MatchRecord = {
      id: Math.random().toString(36).substring(2, 9),
      courtNumber,
      winners: flatWinners, 
      losers: flatLosers,   
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
        { name: 'Adam J', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Rob S', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Dave O', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Dave A', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Stephen L', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Stephen H', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Damien', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Ryan', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Nayab', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Clare', gender: 'female', status: 'absent', queueOrder: 999 },
        { name: 'Dan', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Aniston', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Jebin', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Ash', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Jarek', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Khai', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Esmee', gender: 'female', status: 'absent', queueOrder: 999 },
        { name: 'Colin', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Nigel', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Natalie', gender: 'female', status: 'absent', queueOrder: 999 },
        { name: 'Kev', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Rich', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Tom', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Charles', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Ian', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'James', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Jim', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Krishnan', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Celia', gender: 'female', status: 'absent', queueOrder: 999 },
        { name: 'Rojen', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Sam', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Vital', gender: 'male', status: 'absent', queueOrder: 999 },
        { name: 'Adam H', gender: 'male', status: 'absent', queueOrder: 999 },
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

  // ==========================================
  // 4. ISOLATED AUTO-DRIVE TIMER-BASED LOOP
  // ==========================================
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isHydrated || !isAutoActiveRef.current || isProcessingAutoDrive.current) return;

      const extractNextPick = (queueList: string[], needed: number = 4): string[] | null => {
        if (queueList.length < 8) return null; 
        const picker = queueList[0];
        const candidates = queueList.slice(1, 8);
        const randomized = [...candidates].sort(() => 0.5 - Math.random());
        return [picker, ...randomized.slice(0, needed - 1)];
      };

      let localAttendance = [...attendanceRef.current];
      let localCourts = [...courtsRef.current];
      let localStaged = [...stagedMatchRef.current];
      let modified = false;

      let openCourts = localCourts.filter(c => activeCourtNumsRef.current.includes(c.courtNumber) && c.status === 'empty');
      if (openCourts.length > 0 && localStaged.length === 4) {
        const target = openCourts[0];
        
        let finalStagedGroup = [...localStaged];
        if (isFairPairingRef.current) {
          const playersWithSkill = localStaged.map(name => ({
            name,
            skill: getDynamicSkill(name)
          })).sort((a, b) => b.skill - a.skill);

          const team1 = [playersWithSkill[0], playersWithSkill[3]];
          const team2 = [playersWithSkill[1], playersWithSkill[2]];

          finalStagedGroup = [
            `${team1[0].name} & ${team1[1].name}`,
            `${team2[0].name} & ${team2[1].name}`
          ];
        }

        localCourts = localCourts.map(c => c.courtNumber === target.courtNumber ? { ...c, players: finalStagedGroup, status: 'active' } : c);
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

      openCourts = localCourts.filter(c => activeCourtNumsRef.current.includes(c.courtNumber) && c.status === 'empty');
      while (openCourts.length > 0) {
        const activeQueue = getQueue(localAttendance);
        const group = extractNextPick(activeQueue, 4);
        if (!group) break;

        let finalGroup = [...group];

        if (isFairPairingRef.current) {
          const playersWithSkill = group.map(name => ({
            name,
            skill: getDynamicSkill(name)
          })).sort((a, b) => b.skill - a.skill);

          const team1 = [playersWithSkill[0], playersWithSkill[3]];
          const team2 = [playersWithSkill[1], playersWithSkill[2]];

          finalGroup = [
            `${team1[0].name} & ${team1[1].name}`,
            `${team2[0].name} & ${team2[1].name}`
          ];
        }

        const target = openCourts.shift()!;
        localCourts = localCourts.map(c => c.courtNumber === target.courtNumber ? { ...c, players: finalGroup, status: 'active' } : c);
        localAttendance = localAttendance.map(p => group.includes(p.name) ? { ...p, status: 'playing' } : p);
        modified = true;
      }

      if (localStaged.length < 4) {
        const activeQueue = getQueue(localAttendance);
        if (localStaged.length === 0) {
          const group = extractNextPick(activeQueue, 4);
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
    }, 1000);

    return () => clearInterval(interval);
  }, [isHydrated, orderCounter]);

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
              📊 Player Leaderboard
            </Link>
      
            <Link href="/analytics/pairs" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5">
              👥 Pairs Leaderboard
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
              
              <form onSubmit={addPlayerToMasterRoster} className="flex flex-col gap-3 mb-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newPlayerName} 
                    onChange={e => setNewPlayerName(e.target.value)} 
                    placeholder="Add new member..." 
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-100 flex-grow focus:outline-none focus:border-indigo-500" 
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-4 rounded-lg cursor-pointer">Add</button>
                </div>
                
                {/* Segmented Gender Toggle */}
                <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-semibold justify-around">
                  <button
                    type="button"
                    onClick={() => setNewPlayerGender('male')}
                    className={`flex-1 py-1.5 rounded-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      newPlayerGender === 'male'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[10px]">🚹</span> Male
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPlayerGender('female')}
                    className={`flex-1 py-1.5 rounded-md transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                      newPlayerGender === 'female'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[10px]">🚺</span> Female
                  </button>
                </div>
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
                
                {/* Controls */}
                <div className="flex items-center gap-2">
                  {stagedMatch.length === 0 && !isAutoDriveActive && waitingQueue.length >= 4 && (
                    <button 
                      onClick={handleDrawStrongGame}
                      className="bg-indigo-950/60 border border-indigo-700/50 hover:bg-indigo-900/60 text-indigo-300 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md cursor-pointer animate-pulse"
                    >
                      🔥 Draw Strong Game
                    </button>
                  )}
                  {stagedMatch.length > 0 && !isAutoDriveActive && (
                    <button onClick={handleClearStagingLane} className="text-[10px] uppercase font-bold text-slate-500 hover:text-red-400">
                      Cancel / Clear Staging
                    </button>
                  )}
                </div>
              </div>

              {stagedMatch.length > 0 ? (
                <div>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {stagedMatch.map((name) => (
                      <div key={name} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center flex items-center justify-center min-h-[48px]">
                        <p className="text-sm font-semibold text-white truncate">{name}</p>
                      </div>
                    ))}
                  </div>

                  {!isAutoDriveActive && emptyActiveCourtNumbers.length > 0 && (
                    <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                      {stagedMatch.length === 4 && (
                        <button 
                          onClick={() => handleMoveStagedEvenMatch(emptyActiveCourtNumbers[0])}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          ⚖️ Send Staged to Court {emptyActiveCourtNumbers[0]} (Fair Pairs)
                        </button>
                      )}
                      <button 
                        onClick={() => handleMoveStagedToCourt(emptyActiveCourtNumbers[0])}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        ➡️ Send Staged to Court {emptyActiveCourtNumbers[0]} (As Is)
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-500 italic">
                  {isAutoDriveActive 
                    ? "Waiting for enough players to fill queue..." 
                    : "No match lined up. Tap names in the queue to build the next game, or hit 'Draw Strong Game' for a challenge!"}
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
                        {selectedPlayers.length === 4 && isFairPairingActive && (
                          <div className="mt-2 bg-indigo-950/40 border border-indigo-800/60 rounded-lg p-2 text-center">
                            <button
                              onClick={() => handleDeployEvenMatch(num)}
                              className="w-full text-xs font-bold text-indigo-300 hover:text-indigo-200 py-1 cursor-pointer"
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
                      className="h-32 border-2 border-dashed border-slate-800 bg-slate-900/20 hover:bg-slate-900/60 hover:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600 hover:text-slate-400 group transition-all cursor-pointer"
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
              isFairPairingActive={isFairPairingActive}
              onToggleFairPairing={() => setIsFairPairingActive(!isFairPairingActive)}
              onToggleRest={handleToggleRestState}
              onToggleAttendance={handleToggleAttendance}
            />
          </div>

        </div>
      </div>
    </main>
  );
}