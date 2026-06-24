"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Court from '../components/Court';
import WaitingQueue from '../components/WaitingQueue';
import AttendanceList from '../components/AttendanceList';

interface Player {
  name: string;
  status: 'available' | 'resting' | 'playing' | 'absent';
  queueOrder: number;
}

interface Match {
  id: string;
  players: string[];
  startTime: number;
}

interface CourtType {
  id: number;
  name: string;
  currentMatch: Match | null;
}

export default function Home() {
  // --- STATE ---
  const [attendance, setAttendance] = useState<Player[]>([]);
  const [courts, setCourts] = useState<CourtType[]>([
    { id: 1, name: 'Court 1', currentMatch: null },
    { id: 2, name: 'Court 2', currentMatch: null },
    { id: 3, name: 'Court 3', currentMatch: null },
    { id: 4, name: 'Court 4', currentMatch: null },
  ]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [orderCounter, setOrderCounter] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // --- 1. INITIAL MOUNT: LOAD FROM LOCALSTORAGE ---
  useEffect(() => {
    const savedAttendance = localStorage.getItem('b_attendance');
    const savedCourts = localStorage.getItem('b_courts');
    const savedCounter = localStorage.getItem('b_order_counter');

    if (savedAttendance) {
      const parsedAttendance = JSON.parse(savedAttendance);
      setAttendance(parsedAttendance);
      
      if (savedCounter) {
        setOrderCounter(parseInt(savedCounter, 10));
      } else {
        setOrderCounter(parsedAttendance.length + 1);
      }
    } else {
      // Default fallback starter roster
      const defaultPlayers: Player[] = [
        { name: 'Dave', status: 'available', queueOrder: 1 },
        { name: 'Sarah', status: 'available', queueOrder: 2 },
        { name: 'James', status: 'available', queueOrder: 3 },
        { name: 'Emily', status: 'available', queueOrder: 4 },
        { name: 'Alex', status: 'available', queueOrder: 5 },
        { name: 'Chloe', status: 'available', queueOrder: 6 },
        { name: 'Michael', status: 'absent', queueOrder: 999 },
        { name: 'Jessica', status: 'absent', queueOrder: 999 },
        { name: 'Tom', status: 'absent', queueOrder: 999 },
      ];
      setAttendance(defaultPlayers);
      localStorage.setItem('b_attendance', JSON.stringify(defaultPlayers));
      setOrderCounter(10);
    }

    if (savedCourts) {
      setCourts(JSON.parse(savedCourts));
    }

    setIsInitialLoad(false);
  }, []);

  // --- 2. SAVE ON STATE CHANGES ---
  useEffect(() => {
    if (isInitialLoad) return;
    localStorage.setItem('b_attendance', JSON.stringify(attendance));
  }, [attendance, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    localStorage.setItem('b_courts', JSON.stringify(courts));
  }, [courts, isInitialLoad]);

  useEffect(() => {
    if (isInitialLoad) return;
    localStorage.setItem('b_order_counter', orderCounter.toString());
  }, [orderCounter, isInitialLoad]);

  // --- DERIVED WAITING QUEUE ---
  const queue = attendance
    .filter(p => p.status === 'available')
    .sort((a, b) => a.queueOrder - b.queueOrder)
    .map(p => p.name);

  // --- AUTO-DRIVE BACKGROUND ENGINE LOOP ---
  useEffect(() => {
    if (isInitialLoad) return;

    const timer = setInterval(() => {
      setCourts(prevCourts => {
        const vacantCourtIndex = prevCourts.findIndex(c => c.currentMatch === null);
        if (vacantCourtIndex === -1) return prevCourts;

        let currentQueueList = attendance
          .filter(p => p.status === 'available')
          .sort((a, b) => a.queueOrder - b.queueOrder)
          .map(p => p.name);

        const extractNextAutoPickGroup = (currentQueueList: string[], countNeeded: number = 4): string[] | null => {
          if (currentQueueList.length < 8) return null; // Safe gate for optimal Thursday shuffling
          
          const pickerCandidate = currentQueueList[0];
          const surroundingCandidates = currentQueueList.slice(1, Math.min(8, currentQueueList.length));
          const randomizedPool = [...surroundingCandidates].sort(() => 0.5 - Math.random());
          
          return [pickerCandidate, ...randomizedPool.slice(0, countNeeded - 1)];
        };

        const chosenFour = extractNextAutoPickGroup(currentQueueList, 4);
        if (!chosenFour) return prevCourts;

        // Update player states immediately
        setAttendance(prevAttendance => 
          prevAttendance.map(p => 
            chosenFour.includes(p.name) ? { ...p, status: 'playing' } : p
          )
        );

        const updatedCourts = [...prevCourts];
        updatedCourts[vacantCourtIndex] = {
          ...updatedCourts[vacantCourtIndex],
          currentMatch: {
            id: Math.random().toString(36).substring(2, 9),
            players: chosenFour,
            startTime: Date.now()
          }
        };

        return updatedCourts;
      });

    }, 3000);

    return () => clearInterval(timer);
  }, [attendance, isInitialLoad]);

  // --- HANDLERS ---
  const handleAddPlayerToMasterRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newPlayerName.trim();
    if (!cleanName) return;

    if (attendance.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      alert("A player with that name already exists!");
      return;
    }

    const newPlayer: Player = {
      name: cleanName,
      status: 'available',
      queueOrder: orderCounter
    };

    setAttendance(prev => [...prev, newPlayer]);
    setOrderCounter(prev => prev + 1);
    setNewPlayerName('');
  };

  const handleToggleAttendance = (name: string) => {
    setAttendance(prev => prev.map(p => {
      if (p.name !== name) return p;
      if (p.status === 'absent') {
        return { ...p, status: 'available', queueOrder: orderCounter };
      } else {
        return { ...p, status: 'absent', queueOrder: 999 };
      }
    }));
    setOrderCounter(prev => prev + 1);
  };

  const handleToggleRest = (name: string) => {
    setAttendance(prev => prev.map(p => {
      if (p.name !== name) return p;
      if (p.status === 'resting') {
        return { ...p, status: 'available', queueOrder: orderCounter };
      } else if (p.status === 'available' || p.status === 'playing') {
        return { ...p, status: 'resting', queueOrder: 999 };
      }
      return p;
    }));
    setOrderCounter(prev => prev + 1);
  };

  const handleClearCourt = (courtId: number, matchPlayers: string[]) => {
    setCourts(prev => prev.map(c => c.id === courtId ? { ...c, currentMatch: null } : c));
    
    setAttendance(prev => {
      let currentMaxCounter = orderCounter;
      return prev.map(p => {
        if (matchPlayers.includes(p.name)) {
          if (p.status === 'resting') return p;
          const updatedPlayer = { ...p, status: 'available' as const, queueOrder: currentMaxCounter };
          currentMaxCounter++;
          setOrderCounter(currentMaxCounter);
          return updatedPlayer;
        }
        return p;
      });
    });
  };

  const handleClearAllAttendance = () => {
    if (window.confirm("Are you sure you want to sign out everyone?")) {
      setAttendance(prev => prev.map(p => ({ ...p, status: 'absent', queueOrder: 999 })));
      setCourts(prev => prev.map(c => ({ ...c, currentMatch: null })));
      setOrderCounter(1);
    }
  };

  const handleDeletePlayer = (name: string) => {
    if (window.confirm(`Permanently delete ${name} from database?`)) {
      setAttendance(prev => prev.filter(p => p.name !== name));
    }
  };

  const handleResetSession = () => {
    if (window.confirm("Reset courts and put all active players back into queue?")) {
      setCourts(prev => prev.map(c => ({ ...c, currentMatch: null })));
      setAttendance(prev => {
        let currentMaxCounter = 1;
        const updated = prev.map(p => {
          if (p.status !== 'absent') {
            const up = { ...p, status: 'available' as const, queueOrder: currentMaxCounter };
            currentMaxCounter++;
            return up;
          }
          return p;
        });
        setOrderCounter(currentMaxCounter + 1);
        return updated;
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-indigo-500/30">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              PEGBOARD
            </h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5 hidden sm:block">
              Matchmaking Engine
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button 
              onClick={handleResetSession}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-800 transition-all font-semibold"
            >
              Reset Session
            </button>
          </div>
        </div>
      </header>

      {/* RESPONSIBLE DASHBOARD WRAPPER */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6 h-auto lg:h-[calc(100vh-65px)] overflow-hidden">
        
        {/* LEFT COMPONENT: COURTS CONTAINER */}
        <div className="flex-grow lg:w-2/3 overflow-y-auto pr-0 lg:pr-2 pb-6 lg:pb-0 scrollbar-thin">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
              Live Courts
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
            {courts.map((court) => (
              <Court 
                key={court.id}
                court={court}
                onClearCourt={handleClearCourt}
              />
            ))}
          </div>
        </div>

        {/* RIGHT COMPONENT: MANAGEMENT SIDEBAR */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 bg-slate-900/40 border border-slate-900 p-4 rounded-xl h-auto lg:h-full overflow-y-auto">
          
          {/* Quick Add Form */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-900">
            <form onSubmit={handleAddPlayerToMasterRoster} className="flex gap-2">
              <input 
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="New player name..."
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 w-full text-slate-200"
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-shrink-0"
              >
                Add
              </button>
            </form>
          </div>

          {/* Waiting Queue Track */}
          <div className="flex-shrink-0">
            <WaitingQueue queue={queue} />
          </div>

          {/* Active / Database Lists */}
          <div className="flex-grow overflow-y-auto">
            <AttendanceList 
              players={attendance}
              onToggleRest={handleToggleRest}
              onToggleAttendance={handleToggleAttendance}
              onCheckOutAll={handleClearAllAttendance}
              onDeletePlayer={handleDeletePlayer}
            />
          </div>

        </div>

      </main>
    </div>
  );
}