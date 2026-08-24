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
  color?: string;
  score: number;
  flag_points?: number;
  hints_cost_total?: number;
  hints_used_count?: number;
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
    hint_cost_deducted?: number;
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

  const sortedChallenges = React.useMemo(() => {
    return [...challenges].sort((a, b) => {
      const orderA = a.unlock_order !== undefined && a.unlock_order !== null ? a.unlock_order : 0;
      const orderB = b.unlock_order !== undefined && b.unlock_order !== null ? b.unlock_order : 0;
      if (orderA !== orderB) return orderA - orderB;
      if (a.created_at && b.created_at) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return 0;
    });
  }, [challenges]);

  const handleExportCSV = () => {
    if (filteredLeaderboard.length === 0) {
      toast.error('No leaderboard data to export');
      return;
    }

    const headers = ['Rank', 'Team Name', 'Total Score', 'Flag Points', 'Writeup Score', 'Last Solve Time', ...sortedChallenges.map(c => c.title)];
    const rows = filteredLeaderboard.map(item => {
      const challengeScores = sortedChallenges.map(c => {
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
      {/* Control & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-card p-3 rounded-lg border border-border">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search squad name..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="pl-8 h-9 text-xs w-full"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-xs font-mono text-muted-foreground px-2.5 py-1 bg-muted/40 border border-border rounded">
            {filteredLeaderboard.length} Squads
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5 shrink-0" title="Export Leaderboard to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          {onRefresh && (
            <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9 shrink-0" title="Refresh Scoreboard">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Scoreboard Content: Mobile Card View (< md) & Desktop Matrix Table (>= md) */}
      <div className="rounded-xl border border-border/70 bg-[#090d14] overflow-hidden shadow-2xl">
        {/* Mobile View (< md): Clean, high-density squad ranking cards */}
        <div className="md:hidden divide-y divide-border/40">
          {paginatedLeaderboard.map((item) => (
            <div
              key={item.id}
              onClick={() => setInspectTeamId(item.id)}
              className="p-3.5 flex flex-col gap-2.5 bg-[#0c1017] hover:bg-[#131822] active:bg-primary/10 transition-colors cursor-pointer"
            >
              {/* Card Header: Rank, Squad Info, Total Score */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="shrink-0">
                    {getRankBadge(item.rank)}
                  </div>
                  <Avatar className="h-8 w-8 border shrink-0" style={{ borderColor: item.color ? `${item.color}80` : undefined, boxShadow: item.color ? `0 0 8px ${item.color}33` : undefined }}>
                    <AvatarFallback className="font-mono font-bold text-xs" style={{ color: item.color || '#00F0FF', backgroundColor: item.color ? `${item.color}15` : 'rgba(0,240,255,0.1)' }}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <span className="font-bold text-sm text-foreground truncate" title={item.name}>
                      {item.name}
                    </span>
                    <Eye className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-primary transition-colors shrink-0" />
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-lg font-black text-primary drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">
                      {item.score}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono font-bold">PTS</span>
                  </div>
                  {item.hints_cost_total !== undefined && item.hints_cost_total > 0 && (
                    <span className="text-[9px] font-mono text-red-400 font-bold">
                      -{item.hints_cost_total} hint
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-row: Stats Badges & Timestamp */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-[#090d14] px-2.5 py-1.5 rounded-lg border border-border/40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">
                    Flags: <strong className="text-foreground">{item.flag_points !== undefined ? item.flag_points : item.score}</strong>
                  </span>
                  {item.writeup_score ? (
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Report +{item.writeup_score}
                    </span>
                  ) : null}
                  <span className="text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    {item.solved_challenges?.length || 0} Solved
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3 text-muted-foreground/70" />
                  <span>{formatLastSolve(item.last_solve_at)}</span>
                </div>
              </div>

              {/* Mobile Blood Strike Counts Summary (Only show counts of 1st, 2nd, 3rd blood on mobile, not individual cases) */}
              {(() => {
                const firstBloodsCount = item.solved_challenges?.filter(sc => sc.solve_rank === 1 || sc.is_first_blood).length || 0;
                const secondBloodsCount = item.solved_challenges?.filter(sc => sc.solve_rank === 2).length || 0;
                const thirdBloodsCount = item.solved_challenges?.filter(sc => sc.solve_rank === 3).length || 0;

                if (firstBloodsCount === 0 && secondBloodsCount === 0 && thirdBloodsCount === 0) return null;

                return (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {firstBloodsCount > 0 && (
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold flex items-center gap-1 cursor-help"
                        title={`Tim ini berhasil meraih First Blood (Solve #1 tercepat) pada ${firstBloodsCount} tantangan berbeda.`}
                      >
                        👑 {firstBloodsCount} First Blood
                      </span>
                    )}
                    {secondBloodsCount > 0 && (
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-slate-400/15 text-slate-200 border-slate-400/40 font-bold flex items-center gap-1 cursor-help"
                        title={`Tim ini meraih Second Blood (Solve #2) pada ${secondBloodsCount} tantangan.`}
                      >
                        🥈 {secondBloodsCount} Second Blood
                      </span>
                    )}
                    {thirdBloodsCount > 0 && (
                      <span 
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-600/15 text-amber-400 border-amber-600/40 font-bold flex items-center gap-1 cursor-help"
                        title={`Tim ini meraih Third Blood (Solve #3) pada ${thirdBloodsCount} tantangan.`}
                      >
                        🥉 {thirdBloodsCount} Third Blood
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Desktop View (>= md): Full matrix table with 100% solid sticky columns */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="border-b border-border/70 hover:bg-transparent">
                <th className="h-12 px-3 text-left font-semibold text-cyber-cyan uppercase tracking-wider font-outfit text-xs w-20 min-w-[80px] max-w-[80px] sticky left-0 bg-[#0c1017] z-30 border-b border-r border-border/70">
                  Rank
                </th>
                <th className="h-12 px-4 text-left font-semibold text-cyber-cyan uppercase tracking-wider font-outfit text-xs w-48 min-w-[192px] max-w-[192px] sticky left-20 bg-[#0c1017] z-30 border-b border-r border-border/70">
                  Squad Team
                </th>
                <th
                  className="h-12 px-4 text-right font-semibold text-cyber-cyan uppercase tracking-wider font-outfit text-xs w-28 min-w-[112px] max-w-[112px] sticky left-[272px] bg-[#0c1017] z-30 border-b border-r-2 border-border font-bold cursor-help shadow-[5px_0_12px_rgba(0,0,0,0.85)]"
                  title="Total Score = Flag Pts + Report Score - Hint Costs. This is the squad's final score."
                >
                  Total Score
                </th>
                <th
                  className="h-12 px-3 text-center font-semibold text-muted-foreground uppercase tracking-wider font-mono text-xs w-28 min-w-[100px] border-b border-r border-border/40 bg-[#090d14] cursor-help"
                  title="Flag Pts = Total points from solved flags (before hint deductions)"
                >
                  Flag Pts
                </th>
                <th className="h-12 px-3 text-center font-semibold text-emerald-400 uppercase tracking-wider font-mono text-xs w-28 min-w-[100px] border-b border-r border-border/40 bg-[#090d14]">
                  Report Score
                </th>
                {sortedChallenges.map(c => (
                  <th key={c.id} className="h-12 px-2 text-center border-b border-r border-border/30 bg-[#090d14] min-w-[85px]">
                    <div className="flex flex-col items-center justify-center" title={c.title}>
                      <span className="text-[10px] text-primary truncate w-[75px] font-mono">{c.title}</span>
                      <span className="text-[9px] text-muted-foreground">{c.points} PTS</span>
                    </div>
                  </th>
                ))}
                <th className="h-12 px-4 text-right font-semibold text-muted-foreground uppercase tracking-wider font-mono text-xs min-w-[140px] border-b border-border/40 bg-[#090d14]">
                  Last Solve
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLeaderboard.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setInspectTeamId(item.id)}
                  className="group hover:bg-[#131822] cursor-pointer transition-colors"
                  title={`Click to view performance diagram and members for ${item.name}`}
                >
                  {/* Sticky 1: Rank */}
                  <td className="p-3 font-medium sticky left-0 bg-[#0c1017] group-hover:bg-[#141923] z-20 border-b border-r border-border/70 w-20 min-w-[80px] max-w-[80px] transition-colors">
                    {getRankBadge(item.rank)}
                  </td>

                  {/* Sticky 2: Squad Team */}
                  <td className="p-3 sticky left-20 bg-[#0c1017] group-hover:bg-[#141923] z-20 border-b border-r border-border/70 w-48 min-w-[192px] max-w-[192px] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-7 w-7 border shrink-0" style={{ borderColor: item.color ? `${item.color}80` : undefined, boxShadow: item.color ? `0 0 6px ${item.color}33` : undefined }}>
                        <AvatarFallback className="font-mono font-bold text-xs" style={{ color: item.color || '#00F0FF', backgroundColor: item.color ? `${item.color}15` : 'rgba(0,240,255,0.1)' }}>
                          {item.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate" title={item.name}>
                          {item.name}
                        </span>
                        <Eye className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </div>
                  </td>

                  {/* Sticky 3: Total Score with strong border divider & shadow */}
                  <td className="p-3 text-right font-mono text-base font-bold text-primary sticky left-[272px] bg-[#0c1017] group-hover:bg-[#141923] z-20 border-b border-r-2 border-border shadow-[5px_0_12px_rgba(0,0,0,0.85)] w-28 min-w-[112px] max-w-[112px] transition-colors">
                    {item.score}
                  </td>

                  {/* Scrollable Column 1: Flag Pts */}
                  <td className="p-3 text-center font-mono text-xs text-muted-foreground border-b border-r border-border/40 bg-[#090d14] group-hover:bg-[#111722] transition-colors">
                    <div className="flex flex-col items-center">
                      <span>{item.flag_points !== undefined ? item.flag_points : item.score}</span>
                      {((item.hints_cost_total && item.hints_cost_total > 0) || (item.flag_points !== undefined && item.flag_points > item.score)) ? (
                        <span
                          className="text-[9px] text-red-400 font-mono font-bold"
                          title="Pengurangan dari hint yang dibuka"
                        >
                          -{item.hints_cost_total || (item.flag_points! - item.score)} hint
                        </span>
                      ) : null}
                    </div>
                  </td>

                  {/* Scrollable Column 2: Report Score */}
                  <td className="p-3 text-center font-mono text-xs font-bold text-emerald-400 border-b border-r border-border/40 bg-[#090d14] group-hover:bg-[#111722] transition-colors">
                    {item.writeup_score ? `+${item.writeup_score}` : '-'}
                  </td>

                  {/* Scrollable Columns 3..N: Challenges */}
                  {sortedChallenges.map(c => {
                    const solved = item.solved_challenges?.find(sc => sc.id === c.id);
                    return (
                      <td key={c.id} className="p-2 text-center border-b border-r border-border/30 bg-[#090d14] group-hover:bg-[#111722] transition-colors">
                        {solved ? (
                          <div className="flex flex-col justify-center items-center h-full gap-0.5 relative py-0.5">
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
                                title={`1st Blood (+${solved.bonus_points ?? 50} PTS Bonus)`}
                              >
                                👑 1st (+{solved.bonus_points ?? 50})
                              </span>
                            )}
                            {solved.solve_rank === 2 && (
                              <span
                                className="text-[8px] font-mono font-bold text-slate-300 bg-slate-400/20 px-1 py-0.5 rounded border border-slate-400/40 whitespace-nowrap shadow-[0_0_8px_rgba(203,213,225,0.2)] flex items-center gap-0.5"
                                title={`2nd Blood (+${solved.bonus_points ?? 25} PTS Bonus)`}
                              >
                                🥈 2nd (+{solved.bonus_points ?? 25})
                              </span>
                            )}
                            {solved.solve_rank === 3 && (
                              <span
                                className="text-[8px] font-mono font-bold text-amber-500 bg-amber-600/20 px-1 py-0.5 rounded border border-amber-600/40 whitespace-nowrap shadow-[0_0_8px_rgba(217,119,6,0.2)] flex items-center gap-0.5"
                                title={`3rd Blood (+${solved.bonus_points ?? 10} PTS Bonus)`}
                              >
                                🥉 3rd (+{solved.bonus_points ?? 10})
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
                      </td>
                    );
                  })}

                  {/* Scrollable Column End: Last Solve */}
                  <td className="p-3 text-right font-mono text-xs text-muted-foreground border-b border-border/40 bg-[#090d14] group-hover:bg-[#111722] transition-colors">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span>{formatLastSolve(item.last_solve_at)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
