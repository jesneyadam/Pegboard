"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MatchRecord {
  id: string;
  courtNumber: number;
  winners: string[];
  losers: string[];
  score: string;
  timestamp: number;
}

interface PairStats {
  pairKey: string;
  p1: string;
  p2: string;
  wins: number;
  losses: number;
  totalMatches: number;
  totalPointsDiff: number;
}

export default function PairsAnalytics() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [minMatchesFilter, setMinMatchesFilter] = useState<number>(3);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const savedMatches = localStorage.getItem('b_matches');
    if (savedMatches) setMatches(JSON.parse(savedMatches));
  }, []);

  const getPairKey = (pA: string, pB: string) => {
    return [pA, pB].sort().join(' & ');
  };

  const pairMap: { [key: string]: PairStats } = {};

  matches.forEach(m => {
    if (m.winners.length === 2) {
      const key = getPairKey(m.winners[0], m.winners[1]);
      if (!pairMap[key]) pairMap[key] = { pairKey: key, p1: m.winners[0], p2: m.winners[1], wins: 0, losses: 0, totalMatches: 0, totalPointsDiff: 0 };
      
      pairMap[key].wins += 1;
      pairMap[key].totalMatches += 1;
      
      const [winStr, loseStr] = m.score.split('-');
      pairMap[key].totalPointsDiff += (parseInt(winStr, 10) || 21) - (parseInt(loseStr, 10) || 0);
    }

    if (m.losers.length === 2) {
      const key = getPairKey(m.losers[0], m.losers[1]);
      if (!pairMap[key]) pairMap[key] = { pairKey: key, p1: m.losers[0], p2: m.losers[1], wins: 0, losses: 0, totalMatches: 0, totalPointsDiff: 0 };
      
      pairMap[key].losses += 1;
      pairMap[key].totalMatches += 1;

      const [winStr, loseStr] = m.score.split('-');
      pairMap[key].totalPointsDiff -= (parseInt(winStr, 10) || 21) - (parseInt(loseStr, 10) || 0);
    }
  });

  const allPairs = Object.values(pairMap)
    .filter(p => p.totalMatches >= minMatchesFilter)
    .map(p => {
      const winRate = p.wins / p.totalMatches;
      const avgPointDiff = p.totalPointsDiff / p.totalMatches;
      const synergyScore = (winRate * 100) + (avgPointDiff * 3);
      return { ...p, synergyScore, winRate };
    })
    .filter(p => 
      searchQuery === '' || 
      p.p1.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.p2.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => b.synergyScore - a.synergyScore);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="max-w-5xl mx-auto">
        
        {/* Unified Header Navigation Matching Sub-Pages */}
        <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Doubles Pairings Leaderboard</h1>
            <p className="text-slate-400 mt-1">Discover hidden chemistry across mixed matches</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/analytics" className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-bold px-3 py-2 rounded-lg transition-all">
              📊 Player Leaderboard
            </Link>
            <Link href="/" className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 text-xs font-bold px-4 py-2.5 rounded-lg transition-all">
              🏠 Pegboard
            </Link>
          </div>
        </header>

        <div className="mb-6">
          <p className="text-slate-400 text-sm">
            Analyzes combinations of players across mixed matches to find your strongest league pairs.
          </p>
        </div>

        {/* Control Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div className="flex-grow">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search Partner / Player
            </label>
            <input 
              type="text" 
              placeholder="Type a member's name to check their best pairings..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Min Matches Played
            </label>
            <select 
              value={minMatchesFilter} 
              onChange={e => setMinMatchesFilter(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 h-[42px]"
            >
              <option value={1}>1 or more</option>
              <option value={2}>2 or more</option>
              <option value={3}>3 or more</option>
              <option value={5}>5 or more</option>
              <option value={8}>8 or more</option>
            </select>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Pairing</th>
                <th className="py-3 px-4 text-center">Matches</th>
                <th className="py-3 px-4 text-center">Win Rate</th>
                <th className="py-3 px-4 text-center">Point Diff</th>
                <th className="py-3 px-4 text-center">Synergy Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {allPairs.length > 0 ? (
                allPairs.map((pair, idx) => {
                  const rawDiff = pair.totalPointsDiff / pair.totalMatches;
                  const isPositiveDiff = rawDiff > 0;
                  const isNegativeDiff = rawDiff < 0;
                  const roundedDiff = rawDiff.toFixed(0);
                  const displayDiff = isPositiveDiff ? `+${roundedDiff}` : roundedDiff;

                  return (
                    <tr key={pair.pairKey} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-500">#{idx + 1}</td>
                      <td className="py-3 px-4 font-semibold text-white">{pair.pairKey}</td>
                      <td className="py-3 px-4 text-center text-slate-300">{pair.totalMatches}</td>
                      <td className="py-3 px-4 text-center text-emerald-400 font-medium">{(pair.winRate * 100).toFixed(1)}%</td>
                      <td className={`py-3 px-4 text-center font-bold font-mono ${
                        isPositiveDiff ? 'text-emerald-400' : isNegativeDiff ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {displayDiff}
                      </td>
                      <td className="py-3 px-4 text-center text-amber-300 font-bold">{pair.synergyScore.toFixed(0)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    No pairs found matching your criteria. Try lowering the minimum matches filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}