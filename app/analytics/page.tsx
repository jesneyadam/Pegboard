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
}

export default function AnalyticsPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([]);

  useEffect(() => {
    const savedMatches = localStorage.getItem('b_matches');
    if (savedMatches) {
      const parsedMatches: MatchRecord[] = JSON.parse(savedMatches);
      setMatches(parsedMatches);

      // Process raw matches into aggregated player statistics
      const statsMap: { [key: string]: { wins: number; losses: number } } = {};

      parsedMatches.forEach(match => {
        match.winners.forEach(winner => {
          if (!statsMap[winner]) statsMap[winner] = { wins: 0, losses: 0 };
          statsMap[winner].wins += 1;
        });

        match.losers.forEach(loser => {
          if (!statsMap[loser]) statsMap[loser] = { wins: 0, losses: 0 };
          statsMap[loser].losses += 1;
        });
      });

      const calculatedLeaderboard: PlayerStats[] = Object.keys(statsMap).map(name => {
        const wins = statsMap[name].wins;
        const losses = statsMap[name].losses;
        const totalMatches = wins + losses;
        const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

        return {
          name,
          wins,
          losses,
          totalMatches,
          winRate
        };
      }).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);

      setLeaderboard(calculatedLeaderboard);
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Navigation */}
        <header className="mb-8 border-b border-slate-800 pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Club Analytics & Leaderboard</h1>
            <p className="text-slate-400 mt-1">Player performance insights and rankings</p>
          </div>
          <Link href="/" className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors">
            ← Back to Pegboard
          </Link>
        </header>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Matches Logged</span>
            <span className="text-4xl font-extrabold text-indigo-400">{matches.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Active Competitors</span>
            <span className="text-4xl font-extrabold text-emerald-400">{leaderboard.length}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-28">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Strongest Player</span>
            <span className="text-2xl font-extrabold text-amber-400 truncate mt-1">
              {leaderboard[0] ? leaderboard[0].name : 'No Data Yet'}
            </span>
            {leaderboard[0] && (
              <span className="text-[10px] text-slate-500 font-medium">
                {leaderboard[0].winRate.toFixed(0)}% Win Rate ({leaderboard[0].wins}W - {leaderboard[0].losses}L)
              </span>
            )}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-800 bg-slate-900/50">
            <h2 className="text-base font-bold text-white uppercase tracking-wider text-sm">Club Leaderboard (Sorted by Win Rate)</h2>
          </div>
          
          {leaderboard.length === 0 ? (
            <div className="text-center py-16 text-slate-500 italic text-sm">
              No match data available yet. Complete a match on the digital pegboard to see rankings!
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
                    <th className="py-3 px-6 font-bold tracking-wider text-center text-amber-400">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaderboard.map((player, index) => (
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
                      <td className="py-4 px-6 text-center font-bold font-mono text-amber-400">
                        {player.winRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
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
          {matches.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-xs">No match history.</div>
          ) : (
            <div className="divide-y divide-slate-800/60 max-h-96 overflow-y-auto">
              {matches.slice().reverse().map((m) => (
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
                  <div className="self-start sm:self-center bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs font-bold tracking-wider text-amber-300">
                    Score: {m.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}