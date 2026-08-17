import React, { useState } from 'react';
import { Trophy, Medal, Clock, Zap, Download, RefreshCw, Search, Eye } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { toast } from 'sonner';
import { formatWIBTime, formatWIBDateTime } from '@/utils/date';

export interface LeaderboardItem {
  rank: number;
  id: string;
  name: string;
  score: number;
  flag_points?: number;
  writeup_score?: number;
  last_solve_at: number;
  solved_challenges?: {
    id: string;
    title: string;
    points: number;
    base_points?: number;
    bonus_points?: number;
    solve_rank?: number;
    category: string;
    is_first_blood?: boolean;
  }[];
}

interface ScoreboardTableProps {
  leaderboard: LeaderboardItem[];
  challenges?: any[];
  isFrozen?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
}

export const ScoreboardTable: React.FC<ScoreboardTableProps> = ({ 
  leaderboard, 
  challenges = [], 
  isFrozen,
  onRefresh,
  loading = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inspectTeamId, setInspectTeamId] = useState<string | null>(null);

  const handleExportCSV = () => {
    if (filteredLeaderboard.length === 0) {
      toast.error('No leaderboard data to export');
      return;
    }

    const headers = ['Rank', 'Team Name', 'Total Score', 'Flag Points', 'Writeup Score', 'Last Solve Time', ...challenges.map(c => c.title)];
    const rows = filteredLeaderboard.map(item => {
      const challengeScores = challenges.map(c => {
        const solved = item.solved_challenges?.find(sc => sc.id === c.id);
        return solved ? solved.points : 0;
      });

      return [
        item.rank,
        item.name,
        item.score,
        item.flag_points || 0,
        item.writeup_score || 0,
        item.last_solve_at ? formatWIBDateTime(item.last_solve_at) : 'No Solves',
        ...challengeScores
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scoreboard_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leaderboard exported to CSV');
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-extrabold text-amber-400 bg-amber-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-500/30 whitespace-nowrap">
            <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 1st
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-extrabold text-slate-300 bg-slate-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-500/30 whitespace-nowrap">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 2nd
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-extrabold text-amber-600 bg-amber-600/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-amber-600/30 whitespace-nowrap">
            <Medal className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 3rd
          </div>
        );
      default:
        return <span className="font-mono text-xs sm:text-base font-bold text-muted-foreground pl-1 sm:pl-3">#{rank}</span>;
    }
  };

  const formatLastSolve = (timestamp: number) => {
    if (!timestamp || timestamp === 0) return 'No Solves Yet';
    return formatWIBTime(timestamp);
  };

  const filteredLeaderboard = leaderboard.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredLeaderboard.length / pageSize) || 1;
  const paginatedLeaderboard = filteredLeaderboard.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (leaderboard.length === 0 && !loading) {
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

      {/* Control & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search squad name..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono text-muted-foreground px-2.5 py-1 bg-muted/40 border border-border rounded">
            {filteredLeaderboard.length} Squads
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export Leaderboard to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9" title="Refresh Scoreboard">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Scoreboard Content: Mobile Card View (< md) & Desktop Matrix Table (>= md) */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Mobile View (< md): Clean, high-density squad ranking cards */}
        <div className="md:hidden divide-y divide-border/30">
          {paginatedLeaderboard.map((item) => (
            <div
              key={item.id}
              onClick={() => setInspectTeamId(item.id)}
              className="p-3.5 flex flex-col gap-2.5 active:bg-primary/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {getRankBadge(item.rank)}
                  </div>
                  <Avatar className="h-7 w-7 border border-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-mono font-bold text-xs">
                      {item.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <span className="font-bold text-sm text-foreground truncate" title={item.name}>
                      {item.name}
                    </span>
                    <Eye className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-base font-black text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                    {item.score}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono ml-1">PTS</span>
                </div>
              </div>

              {/* Sub-row: Flag Pts, Report Score & Solved Count */}
              <div className="flex items-center justify-between text-xs font-mono bg-muted/20 px-2.5 py-1.5 rounded-lg border border-border/40">
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    Flags: <strong className="text-foreground">{item.flag_points !== undefined ? item.flag_points : item.score}</strong>
                  </span>
                  {item.writeup_score ? (
                    <span className="text-emerald-400 font-bold">
                      Report: +{item.writeup_score}
                    </span>
                  ) : null}
                  <span className="text-primary/90">
                    {item.solved_challenges?.length || 0} Solved
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3 text-muted-foreground/70" />
                  <span>{formatLastSolve(item.last_solve_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View (>= md): Full matrix table with sticky columns */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-24 sticky left-0 bg-card z-10 border-r border-border">Rank</TableHead>
                <TableHead className="min-w-[180px] sticky left-24 bg-card z-10 border-r border-border">Squad Team</TableHead>
                <TableHead className="text-right w-28 border-r border-border font-bold">Total Score</TableHead>
                <TableHead className="text-center w-24 border-r border-border text-xs text-muted-foreground font-mono">Flag Pts</TableHead>
                <TableHead className="text-center w-28 border-r border-border text-xs text-emerald-400 font-mono">Report Score</TableHead>
                {challenges.map(c => (
                  <TableHead key={c.id} className="text-center px-1 min-w-[80px]">
                    <div className="flex flex-col items-center justify-center" title={c.title}>
                      <span className="text-[10px] text-primary truncate w-[70px] font-mono">{c.title}</span>
                      <span className="text-[9px] text-muted-foreground">{c.points} PTS</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-right min-w-[150px]">Last Solve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeaderboard.map((item) => (
                <TableRow
                  key={item.id}
                  onClick={() => setInspectTeamId(item.id)}
                  className="group hover:bg-primary/5 border-border cursor-pointer transition-colors"
                  title={`Klik untuk melihat statistik diagram dan anggota ${item.name}`}
                >
                  <TableCell className="font-medium sticky left-0 bg-card z-10 border-r border-border">
                    {getRankBadge(item.rank)}
                  </TableCell>
                  <TableCell className="sticky left-24 bg-card z-10 border-r border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarFallback className="bg-primary/10 text-primary font-mono font-bold text-xs">
                          {item.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[160px]" title={item.name}>
                          {item.name}
                        </span>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-base font-bold text-primary border-r border-border">
                    {item.score}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground border-r border-border">
                    {item.flag_points !== undefined ? item.flag_points : item.score}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-bold text-emerald-400 border-r border-border">
                    {item.writeup_score ? `+${item.writeup_score}` : '-'}
                  </TableCell>

                  {challenges.map(c => {
                    const solved = item.solved_challenges?.find(sc => sc.id === c.id);
                    return (
                      <TableCell key={c.id} className="text-center px-1 border-r border-border/40">
                        {solved ? (
                          <div className="flex flex-col justify-center items-center h-full gap-0.5 relative py-1">
                            <span
                              className={`font-bold text-xs ${
                                solved.solve_rank === 1 || solved.is_first_blood
                                  ? 'text-amber-400 font-extrabold'
                                  : solved.solve_rank === 2
                                  ? 'text-slate-200 font-bold'
                                  : solved.solve_rank === 3
                                  ? 'text-amber-500 font-bold'
                                  : 'text-primary'
                              }`}
                            >
                              +{solved.points}
                            </span>
                            {(solved.solve_rank === 1 || solved.is_first_blood) && (
                              <span
                                className="text-[8px] font-mono font-black text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded border border-amber-500/40 whitespace-nowrap shadow-[0_0_8px_rgba(251,191,36,0.25)] flex items-center gap-0.5"
                                title="1st Blood (+50 PTS Bonus)"
                              >
                                👑 1st (+50)
                              </span>
                            )}
                            {solved.solve_rank === 2 && (
                              <span
                                className="text-[8px] font-mono font-bold text-slate-300 bg-slate-400/20 px-1 py-0.5 rounded border border-slate-400/40 whitespace-nowrap shadow-[0_0_8px_rgba(203,213,225,0.2)] flex items-center gap-0.5"
                                title="2nd Blood (+25 PTS Bonus)"
                              >
                                🥈 2nd (+25)
                              </span>
                            )}
                            {solved.solve_rank === 3 && (
                              <span
                                className="text-[8px] font-mono font-bold text-amber-500 bg-amber-600/20 px-1 py-0.5 rounded border border-amber-600/40 whitespace-nowrap shadow-[0_0_8px_rgba(217,119,6,0.2)] flex items-center gap-0.5"
                                title="3rd Blood (+10 PTS Bonus)"
                              >
                                🥉 3rd (+10)
                              </span>
                            )}
                            {solved.solve_rank && solved.solve_rank >= 4 && (
                              <span
                                className="text-[7.5px] font-mono text-muted-foreground/80 px-1 py-0.2 rounded bg-muted/40 whitespace-nowrap"
                                title={`Solve #${solved.solve_rank} (${solved.bonus_points && solved.bonus_points < 0 ? `${solved.bonus_points} PTS decay` : 'Standard points'})`}
                              >
                                #{solved.solve_rank} hit
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
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span>{formatLastSolve(item.last_solve_at)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Scoreboard Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredLeaderboard.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* SQUAD / TEAM DETAIL & PERFORMANCE MODAL */}
      <TeamDetailModal
        teamId={inspectTeamId}
        open={Boolean(inspectTeamId)}
        onOpenChange={(open) => !open && setInspectTeamId(null)}
      />
    </div>
  );
};
