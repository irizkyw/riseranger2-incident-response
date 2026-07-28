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
  solved_challenges?: { title: string; points: number; category: string }[];
}

interface ScoreboardTableProps {
  leaderboard: LeaderboardItem[];
  isFrozen?: boolean;
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ leaderboard, isFrozen }) => {
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
        <div className="flex items-center justify-center gap-2 rounded-md bg-cyber-pink/20 border border-cyber-pink/50 p-3 text-sm font-bold text-cyber-pink shadow-[0_0_15px_rgba(255,0,127,0.3)] animate-pulse">
          <Zap className="h-4 w-4" /> SCOREBOARD IS CURRENTLY FROZEN! Live updates are paused until event ends.
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">Rank</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead className="text-right w-44">Last Solve (Tie-breaker)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((item) => (
            <TableRow key={item.id} className="group hover:bg-cyber-cyan/5 transition-colors">
              <TableCell className="font-medium">{getRankBadge(item.rank)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1.5 py-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-cyber-cyan/30">
                      <AvatarFallback className="bg-gradient-to-tr from-cyber-cyan/20 to-cyber-purple/20 text-white font-mono font-bold">
                        {item.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-outfit font-bold text-base text-white group-hover:text-cyber-cyan transition-colors">
                      {item.name}
                    </span>
                  </div>
                  {item.solved_challenges && item.solved_challenges.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 pl-12">
                      {item.solved_challenges.map((sc, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0.5 bg-white/5 border-white/10 text-muted-foreground whitespace-nowrap">
                          {sc.category}: <span className="text-white ml-1">{sc.title}</span> <span className="text-cyber-cyan ml-1">+{sc.points}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-mono text-lg font-black text-cyber-cyan">
                {item.score} <span className="text-xs text-muted-foreground font-normal">PTS</span>
              </TableCell>
              <TableCell className="text-right font-mono text-xs text-muted-foreground flex items-center justify-end gap-1.5 pt-6">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatLastSolve(item.last_solve_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
