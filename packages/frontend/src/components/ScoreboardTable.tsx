import React from 'react';
import { Trophy, Medal, Clock, Zap } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export interface LeaderboardItem {
  rank: number;
  id: string;
  name: string;
  score: number;
  last_solve_at: number;
  solved_challenges?: { id: string; title: string; points: number; category: string; is_first_blood?: boolean }[];
}

interface ScoreboardTableProps {
  leaderboard: LeaderboardItem[];
  challenges?: any[];
  isFrozen?: boolean;
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ leaderboard, challenges = [], isFrozen }) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredLeaderboard = leaderboard.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1.5 font-black text-yellow-400 bg-yellow-400/20 px-2.5 py-1 rounded-full border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)] animate-pulse">
            <Trophy className="h-4 w-4" /> 1st
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1.5 font-bold text-slate-300 bg-slate-400/20 px-2.5 py-1 rounded-full border border-slate-400/50 shadow-[0_0_10px_rgba(203,213,225,0.2)]">
            <Medal className="h-4 w-4" /> 2nd
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1.5 font-bold text-amber-600 bg-amber-600/20 px-2.5 py-1 rounded-full border border-amber-600/50 shadow-[0_0_10px_rgba(217,119,6,0.2)]">
            <Medal className="h-4 w-4" /> 3rd
          </div>
        );
      default:
        return <span className="font-mono text-base font-bold text-muted-foreground pl-3">#{rank}</span>;
    }
  };

  const formatLastSolve = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'No Solves Yet';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-lg border border-border/50 glass-panel">
        <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-bold text-white">Scoreboard Empty</h3>
        <p className="text-sm text-muted-foreground">No teams have scored points yet. Be the first to hit a flag!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isFrozen && (
        <div className="flex items-center justify-center gap-2 rounded-md bg-cyber-pink/20 border border-cyber-pink/50 p-3 text-sm font-bold text-cyber-pink shadow-[0_0_15px_rgba(255,0,127,0.3)] animate-pulse mb-4">
          <Zap className="h-4 w-4" /> SCOREBOARD IS CURRENTLY FROZEN! Live updates are paused until event ends.
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search team..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-border/50 bg-black/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan focus-visible:border-cyber-cyan disabled:cursor-not-allowed disabled:opacity-50 pl-9 font-mono text-white transition-all shadow-inner focus:shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          />
        </div>
        <div className="text-sm font-mono text-muted-foreground px-3 py-1 bg-black/40 border border-border/30 rounded-md">
          {filteredLeaderboard.length} Teams Found
        </div>
      </div>
      <div className="overflow-x-auto pb-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24 sticky left-0 bg-black z-10 border-r border-border/50">Rank</TableHead>
              <TableHead className="min-w-[200px] sticky left-24 bg-black z-10 border-r border-border/50">Team</TableHead>
              <TableHead className="text-right w-24 border-r border-border/50">Score</TableHead>
              {challenges.map(c => (
                <TableHead key={c.id} className="text-center px-1 min-w-[80px]">
                  <div className="flex flex-col items-center justify-center" title={c.title}>
                    <span className="text-[10px] text-cyber-cyan truncate w-[70px] font-mono">{c.title}</span>
                    <span className="text-[9px] text-muted-foreground">{c.points}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right min-w-[150px]">Last Solve</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {filteredLeaderboard.map((item) => (
            <TableRow key={item.id} className="group hover:bg-cyber-cyan/5 transition-colors">
              <TableCell className="font-medium sticky left-0 bg-black z-10 border-r border-border/50">{getRankBadge(item.rank)}</TableCell>
              <TableCell className="sticky left-24 bg-black z-10 border-r border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-cyber-cyan/30">
                    <AvatarFallback className="bg-gradient-to-tr from-cyber-cyan/20 to-cyber-purple/20 text-white font-mono font-bold">
                      {item.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-outfit font-bold text-base text-white group-hover:text-cyber-cyan transition-colors truncate max-w-[150px]" title={item.name}>
                    {item.name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-lg font-black text-cyber-cyan border-r border-border/50">
                {item.score}
              </TableCell>
              {challenges.map(c => {
                const solved = item.solved_challenges?.find(sc => sc.id === c.id);
                return (
                  <TableCell key={c.id} className="text-center px-1 border-r border-border/10">
                    {solved ? (
                      <div className="flex flex-col justify-center items-center h-full gap-0.5 relative py-1">
                        <span className="text-cyber-cyan font-black text-sm drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">+{solved.points}</span>
                        {solved.is_first_blood && (
                          <span className="text-[8px] font-mono font-bold text-yellow-400 bg-yellow-400/10 px-1 rounded border border-yellow-400/30 whitespace-nowrap drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]">
                            👑 FB
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-center items-center h-full text-muted-foreground/30 font-bold">
                        -
                      </div>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-right font-mono text-xs text-muted-foreground flex items-center justify-end gap-1.5 h-[60px]">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatLastSolve(item.last_solve_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};
