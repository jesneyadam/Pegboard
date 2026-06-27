"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MatchRecord {
  id: string;
  courtNumber: number;
  winners: string[];
  losers: string[];
  score: string;
  timestamp: number;
}

interface PlayerStats {
  name: string;
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  pointDifferential: number; // Added tracking points differential metric
}

interface MasterPlayer {
  name: string;
  gender: 'male' | 'female';
}

export default function AnalyticsPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [masterRoster, setMasterRoster] = useState<MasterPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);
  
  // Gender filter state: 'all' | 'male' | 'female'
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  // States to keep track of inline editing per row
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScore1, setEditScore1] = useState<string>('');
  const [editScore2, setEditScore2] = useState<string>('');

  // Extracted helper function to calculate analytics over a provided match dataset
  const processMatchStatistics = (allMatches: MatchRecord[]) => {
    const statsMap: { [key: string]: { wins: number; losses: number; differential: number } } = {};

    allMatches.forEach(match => {
      // Parse score string "XX-YY" to calculate points differential
      const [score1Str, score2Str] = match.score.split('-');
      const score1 = parseInt(score1Str, 10) || 0;
      const score2 = parseInt(score2Str, 10) || 0;

      // Determine margin. Winner score is on the left by standard logging conventions.
      const pointDiff = Math.abs(score1 - score2);

      match.winners.forEach(winner => {
        if (!statsMap[winner]) statsMap[winner] = { wins: 0, losses: 0, differential: 0 };
        statsMap[winner].wins += 1;
        statsMap[winner].differential += pointDiff; // Winners gain points
      });

      match.losers.forEach(loser => {
        if (!statsMap[loser]) statsMap[loser] = { wins: 0, losses: 0, differential: 0 };
        statsMap[loser].losses += 1;
        statsMap[loser].differential -= pointDiff; // Losers lose points
      });
    });

    const calculatedLeaderboard: PlayerStats[] = Object.keys(statsMap).map(name => {
      const wins = statsMap[name].wins;
      const losses = statsMap[name].losses;
      const totalMatches = wins + losses;
      const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
      const pointDifferential = statsMap[name].differential;

      return {
        name,
        wins,
        losses,
        totalMatches,
        winRate,
        pointDifferential
      };
    }).sort((a, b) => 
      b.winRate - a.winRate || 
      b.pointDifferential - a.pointDifferential || 
      b.wins - a.wins
    );

    setLeaderboard(calculatedLeaderboard);
  };

  useEffect(() => {
    const savedMatches = localStorage.getItem('b_matches');
    const savedRoster = localStorage.getItem('b_attendance');
    
    let parsedRoster: MasterPlayer[] = [];
    if (savedRoster) {
      parsedRoster = JSON.parse(savedRoster);
      setMasterRoster(parsedRoster);
    }

    if (savedMatches) {
      const parsedMatches: MatchRecord[] = JSON.parse(savedMatches);
      setMatches(parsedMatches);
      processMatchStatistics(parsedMatches);
    }
  }, []);

  // 1. Filter the Master Roster based on gender filter
  const isGenderMatch = (playerName: string, targetGender: 'male' | 'female') => {
    const p = masterRoster.find(item => item.name.toLowerCase() === playerName.toLowerCase());
    return p ? p.gender === targetGender : false;
  };

  // 2. Filter Leaderboard (Ranks)
  const filteredLeaderboard = leaderboard.filter(player => {
    if (genderFilter === 'all') return true;
    return isGenderMatch(player.name, genderFilter);
  });

  // 3. Filter Matches based on whether at least one player of the selected gender participated
  const filteredMatches = matches.filter(match => {
    if (genderFilter === 'all') return true;
    const allParticipants = [...match.winners, ...match.losers];
    return allParticipants.some(player => isGenderMatch(player, genderFilter));
  });

  // Set up inline tracking parameters for changes
  const handleStartEdit = (match: MatchRecord) => {
    setEditingMatchId(match.id);
    const [s1, s2] = match.score.split('-');
    setEditScore1(s1 || '0');
    setEditScore2(s2 || '0');
  };

  const handleCancelEdit = () => {
    setEditingMatchId(null);
    setEditScore1('');
    setEditScore2('');
  };

  // Enforce score input limitations cleanly
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

  const handleSaveScore = (matchId: string) => {
    const finalScoreStr = editScore1 && editScore2 ? `${editScore1}-${editScore2}` : 'XX-XX';
    
    const updatedMatches = matches.map(m => {
      if (m.id === matchId) {
        return { ...m, score: finalScoreStr };
      }
      return m;
    });

    setMatches(updatedMatches);
    localStorage.setItem('b_matches', JSON.stringify(updatedMatches));
    
    // Recalculate complete leaderboard stats dynamically
    processMatchStatistics(updatedMatches);
    handleCancelEdit();
  };

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Navigation with unified consistency across app pages */}
        <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Club Analytics & Leaderboard</h1>
            <p className="text-slate-400 mt-1">Player performance insights and rankings</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-all">
              🏠 Pegboard
            </Link>
            <Link href="/analytics/pairs" className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5">
              👥 Pairs Leaderboard
            </Link>
          </div>
        </header>

        {/* Header title & segmented gender filters side by side */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Individual Player Analytics</h1>
          
          {/* Segmented Filter Options (All, Male, Female) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setGenderFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer ${
                genderFilter === 'all' 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              🌎 All Players
            </button>
            <button
              onClick={() => setGenderFilter('male')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                genderFilter === 'male' 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              ♂️ Male
            </button>
            <button
              onClick={() => setGenderFilter('female')}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-all cursor-pointer flex items-center gap-1 ${
                genderFilter === 'female' 
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              ♀️ Female
            </button>
          </div>
        </div>

        {/* Overview Stats (Filter Aware) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Matches Logged</span>
            <span className="text-4xl font-extrabold text-indigo-400">{filteredMatches.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Competitors</span>
            <span className="text-4xl font-extrabold text-emerald-400">{filteredLeaderboard.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Strongest Player</span>
            <span className="text-2xl font-extrabold text-amber-400 truncate mt-1">
              {filteredLeaderboard[0] ? filteredLeaderboard[0].name : 'No Data Yet'}
            </span>
            {filteredLeaderboard[0] && (
              <span className="text-[10px] text-slate-500 font-medium">
                {filteredLeaderboard[0].winRate.toFixed(0)}% Win Rate ({filteredLeaderboard[0].wins}W - {filteredLeaderboard[0].losses}L)
              </span>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-sm">
              Club Leaderboard ({genderFilter === 'all' ? 'All Players' : genderFilter === 'male' ? 'Male Rankings' : 'Female Rankings'} - Ranked by Win Rate then Points Diff)
            </h2>
          </div>
          
          {filteredLeaderboard.length === 0 ? (
            <div className="text-center py-16 text-slate-500 italic text-sm">
              No match data available for this category yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 text-xs uppercase">
                    <th className="py-3 px-6 font-bold tracking-wider w-16 text-center">Rank</th>
                    <th className="py-3 px-6 font-bold tracking-wider">Player Name</th>
                    <th className="py-3 px-6 font-bold tracking-wider text-center">Played</th>
                    <th className="py-3 px-6 font-bold tracking-wider text-center text-emerald-400">Wins</th>
                    <th className="py-3 px-6 font-bold tracking-wider text-center text-rose-400">Losses</th>
                    <th className="py-3 px-6 font-bold tracking-wider text-center text-indigo-400">Point Diff (+/-)</th>
                    <th className="py-3 px-6 font-bold tracking-wider text-center text-amber-400">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredLeaderboard.map((player, index) => {
                    const isPositiveDiff = player.pointDifferential > 0;
                    const isNegativeDiff = player.pointDifferential < 0;

                    return (
                      <tr key={player.name} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-4 px-6 font-bold text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] ${
                            index === 0 ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold' :
                            index === 1 ? 'bg-slate-400/20 border border-slate-400/40 text-slate-200' :
                            index === 2 ? 'bg-amber-800/30 border border-amber-700/40 text-amber-700' :
                            'text-slate-600'
                          }`}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-semibold text-white">{player.name}</td>
                        <td className="py-4 px-6 text-center text-slate-400 font-mono">{player.totalMatches}</td>
                        <td className="py-4 px-6 text-center text-emerald-300 font-semibold font-mono">{player.wins}</td>
                        <td className="py-4 px-6 text-center text-rose-300 font-semibold font-mono">{player.losses}</td>
                        <td className={`py-4 px-6 text-center font-bold font-mono ${
                          isPositiveDiff ? 'text-emerald-400' : isNegativeDiff ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {isPositiveDiff ? `+${player.pointDifferential}` : player.pointDifferential}
                        </td>
                        <td className="py-4 px-6 text-center font-bold font-mono text-amber-400">
                          {player.winRate.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Raw Match History Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-sm">Match History Log</h2>
          </div>
          {filteredMatches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-xs">No match history for this category.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-[500px] overflow-y-auto">
              {filteredMatches.slice().reverse().map((m) => {
                const isEditing = editingMatchId === m.id;

                return (
                  <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-950/40 transition-colors">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block mb-1">
                        Court {m.courtNumber} • {new Date(m.timestamp).toLocaleString()}
                      </span>
                      <div className="text-xs space-y-0.5">
                        <div>
                          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Winners:</span>{' '}
                          <span className="font-medium text-slate-200">{m.winners.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-rose-400 font-bold uppercase tracking-wider text-[9px]">Losers:</span>{' '}
                          <span className="font-medium text-slate-300">{m.losers.join(', ')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {isEditing ? (
                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                          <input 
                            type="number"
                            min="0"
                            max="30"
                            value={editScore1}
                            onChange={e => handleScoreInputChange(e.target.value, setEditScore1)}
                            className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-xs py-0.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                          />
                          <span className="text-slate-500 font-bold">-</span>
                          <input 
                            type="number"
                            min="0"
                            max="30"
                            value={editScore2}
                            onChange={e => handleScoreInputChange(e.target.value, setEditScore2)}
                            className="w-10 bg-slate-900 border border-slate-700 text-center rounded text-xs py-0.5 text-amber-300 font-mono font-bold focus:outline-none focus:border-indigo-500"
                          />
                          <button 
                            onClick={() => handleSaveScore(m.id)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 py-1 rounded transition-colors ml-1"
                          >
                            Save
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-[10px] px-2 py-1 rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs font-bold tracking-wider text-amber-300">
                            Score: {m.score}
                          </div>
                          <button 
                            onClick={() => handleStartEdit(m)}
                            className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-950/30 border border-indigo-900/50 rounded-md px-2.5 py-1.5 transition-all"
                          >
                            ✏️ Edit Score
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}