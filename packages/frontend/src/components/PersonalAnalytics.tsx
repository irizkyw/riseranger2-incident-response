import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import {
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  Users,
  Award,
  Layers,
  Activity,
  Flame,
  Calendar,
  Sparkles,
  Clock,
  Crown,
  History,
  BarChart3,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TeamAnalytics } from '@/components/TeamAnalytics';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import api from '@/services/api';

interface PersonalStats {
  personal_score?: number;
  solved_count?: number;
  failed_count?: number;
  total_submissions?: number;
  accuracy_rate?: number;
  hints_used_count?: number;
  hints_cost_total?: number;
  category_breakdown?: {
    category: string;
    count: number;
    points: number;
    percentage: number;
  }[];
  solved_challenges?: {
    id: string;
    title: string;
    category: string;
    points: number;
    solved_at: string;
  }[];
}

interface PersonalAnalyticsProps {
  stats?: PersonalStats;
  team?: any;
  currentUserId?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  INCIDENT_RESPONSE: '#F43F5E',
  DIGITAL_FORENSICS: '#00F0FF',
  WEB_EXPLOITATION: '#A855F7',
  NETWORK_ANALYSIS: '#10B981',
  REVERSE_ENGINEERING: '#FACC15',
  CRYPTOGRAPHY: '#38BDF8',
  MISC: '#FB923C'
};

const PersonalAccuracyTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700 px-3 py-2 rounded-lg shadow-2xl font-mono text-xs z-[9999] pointer-events-none whitespace-nowrap min-w-max backdrop-blur-md">
        <div className="flex items-center gap-2">
          {item.payload?.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.payload.color }} />
          )}
          <span className="text-[#FFFFFF] font-semibold">{item.name}:</span>
          <span className="text-[#00F0FF] font-bold">{item.value} Flags</span>
        </div>
      </div>
    );
  }
  return null;
};

const PersonalCategoryTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700 px-3 py-2 rounded-lg shadow-2xl font-mono text-xs z-[9999] pointer-events-none whitespace-nowrap min-w-max backdrop-blur-md">
        <p className="text-[#00F0FF] font-black mb-1">{label || item.payload?.category}</p>
        <div className="flex items-center gap-2">
          <span className="text-[#FFFFFF] font-semibold">Points:</span>
          <span className="text-[#00F0FF] font-bold">{item.value} PTS</span>
        </div>
      </div>
    );
  }
  return null;
};

export const PersonalAnalytics: React.FC<PersonalAnalyticsProps> = ({
  stats,
  team,
  currentUserId
}) => {
  const personalScore = stats?.personal_score || 0;
  const solvedCount = stats?.solved_count || 0;
  const failedCount = stats?.failed_count || 0;
  const totalSubmissions = stats?.total_submissions || 0;
  const accuracyRate = stats?.accuracy_rate || (totalSubmissions > 0 ? Math.round((solvedCount / totalSubmissions) * 100) : 0);
  const hintsUsedCount = stats?.hints_used_count || 0;
  const hintsCostTotal = stats?.hints_cost_total || 0;
  const categoryBreakdown = stats?.category_breakdown || [];
  const solvedChallenges = stats?.solved_challenges || [];

  const teamScore = team?.score || 0;
  const contributionPercentage = teamScore > 0 ? Math.round((personalScore / teamScore) * 100) : 0;

  // Squad History State & Modal State
  const [squadHistory, setSquadHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryTeamId, setSelectedHistoryTeamId] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const res = await api.get('/teams/history/my');
        setSquadHistory(res.data || []);
      } catch (err) {
        console.error('Failed to load squad history in analytics:', err);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [team]);

  // Donut chart data for personal accuracy
  const accuracyData = [
    { name: 'Solves (Valid Flags)', value: solvedCount, color: '#10B981' },
    { name: 'Hit Missed (Wrong Flags)', value: failedCount, color: '#F43F5E' }
  ];
  const hasSubmissions = totalSubmissions > 0;

  // Bar chart data for categories
  const categoryChartData = categoryBreakdown.map((c) => ({
    category: c.category.replace(/_/g, ' '),
    rawCategory: c.category,
    points: c.points,
    count: c.count,
    percentage: c.percentage,
    color: CATEGORY_COLORS[c.category] || '#00F0FF'
  }));

  return (
    <div className="space-y-6">
      {/* 1. HERO PERSONAL STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Personal Points Contributed */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Personal Points</span>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-primary">{personalScore}</span>
            <span className="text-xs font-mono text-muted-foreground font-bold">PTS</span>
          </div>
          <div className="mt-1">
            {team ? (
              <Badge variant="outline" className="font-mono">
                {contributionPercentage}% of Team Score
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono">Accumulated Points</span>
            )}
          </div>
        </div>

        {/* Personal Accuracy Rate */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Flag Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-emerald-400">{accuracyRate}%</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            <span className="text-emerald-400 font-bold">{solvedCount}</span> Solves / <span className="text-rose-400 font-bold">{failedCount}</span> Hit Missed
          </div>
        </div>

        {/* Personal Solves Count */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Solved Challenges</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-foreground">{solvedCount}</span>
            <span className="text-xs text-muted-foreground">Solved</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            Out of {totalSubmissions} attempts
          </div>
        </div>

        {/* Hints Used */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hints Used</span>
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-amber-400">{hintsUsedCount}</span>
            <span className="text-xs font-mono text-muted-foreground">Used</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {hintsCostTotal > 0 ? (
              <span className="text-rose-400 font-semibold">-{hintsCostTotal} PTS Penalty</span>
            ) : (
              <span className="text-slate-400">0 PTS Penalty</span>
            )}
          </div>
        </div>

        {/* Squad Status / Rank */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Squad Status</span>
            <Users className="h-4 w-4 text-cyber-purple" />
          </div>
          <div className="mt-2 truncate font-bold text-foreground text-base sm:text-lg font-outfit">
            {team?.name || 'No Squad'}
          </div>
          <div className="mt-1">
            {team ? (
              <Badge variant="outline" className="font-mono">
                Rank #{team.rank || '—'} • {team.score} PTS
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono">Not in a Squad</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. DIAGRAMS: SUBMISSION ACCURACY & CATEGORY MASTERY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut Chart: Personal Accuracy */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Target className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                    Personal Flag Accuracy Breakdown
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Percentage of valid flag solves vs hit missed attempts
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="py-0 px-2 font-mono font-bold h-5 leading-none">
                {accuracyRate}% Accuracy
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {!hasSubmissions ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                <Target className="h-7 w-7 mb-2 opacity-30" />
                No flag submissions sent by you yet.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="h-44 w-full sm:w-1/2 relative flex items-center justify-center">
                  {/* Center Label (Layered behind tooltip) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none">
                    <span className="text-lg font-black font-outfit text-foreground">{accuracyRate}%</span>
                    <span className="text-[9px] font-mono text-muted-foreground uppercase">Accuracy</span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                    <PieChart>
                      <Pie
                        data={accuracyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {accuracyData.map((entry, index) => (
                          <Cell key={`cell-personal-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip content={<PersonalAccuracyTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-1/2 space-y-2.5 font-mono text-xs">
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-bold text-[11px]">Valid Solves</span>
                    </div>
                    <span className="font-bold text-foreground text-xs">
                      {solvedCount} ({hasSubmissions ? Math.round((solvedCount / totalSubmissions) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                      <span className="text-rose-400 font-bold text-[11px]">Hit Missed Flags</span>
                    </div>
                    <span className="font-bold text-foreground text-xs">
                      {failedCount} ({hasSubmissions ? Math.round((failedCount / totalSubmissions) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="p-1.5 rounded bg-muted/40 border border-border flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Total Submissions:</span>
                    <span className="font-bold text-foreground">{totalSubmissions} Attempts</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                    Category Mastery
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Points earned across different CTF challenge categories
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="py-0 px-2 font-mono h-5 leading-none">
                {categoryBreakdown.length} Categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {categoryBreakdown.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                <Layers className="h-7 w-7 mb-2 opacity-30" />
                No challenges solved in any category yet.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} margin={{ top: 5, right: 5, left: -25, bottom: 15 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis
                        dataKey="category"
                        stroke="#64748B"
                        fontSize={9}
                        tickLine={false}
                        interval={0}
                        angle={-10}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748B" fontSize={9} tickLine={false} />
                      <Tooltip content={<PersonalCategoryTooltip />} />
                      <Bar dataKey="points" radius={[3, 3, 0, 0]}>
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`bar-cat-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {categoryBreakdown.map((cat, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="font-mono py-0.5 px-2"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full mr-1"
                        style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#00F0FF' }}
                      />
                      {cat.category.replace(/_/g, ' ')}: <strong className="ml-1 text-primary">{cat.points} pts</strong>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. SOLVED CHALLENGES LIST */}
      {solvedChallenges.length > 0 && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                  Solved Challenges History ({solvedChallenges.length})
                </CardTitle>
              </div>
              <Badge variant="outline" className="py-0 px-2 font-mono h-5 leading-none">
                +{personalScore} PTS Earned
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-border/60 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {solvedChallenges.map((ch) => (
                <div key={ch.id} className="py-2 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span className="font-semibold text-foreground">{ch.title}</span>
                    <Badge variant="outline" className="py-0 px-1.5">
                      {ch.category}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-primary font-bold">+{ch.points} PTS</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ch.solved_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. RIWAYAT SQUAD & TIM (SQUAD HISTORY LIST WITH INTERACTIVE PERFORMANCE INSPECTION) */}
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <History className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground flex items-center gap-2">
                  Squad & Team History
                  <Badge variant="outline" className="py-0 px-1.5 font-mono font-medium h-4.5 leading-none">
                    {squadHistory.length} SQUAD
                  </Badge>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Squads you created (as Leader) or joined in competition arenas.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3">
          {historyLoading ? (
            <div className="py-6 text-center text-xs font-mono text-muted-foreground animate-pulse">
              Loading squad history...
            </div>
          ) : squadHistory.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground space-y-1">
              <Users className="h-7 w-7 mx-auto opacity-30" />
              <p className="text-xs font-mono">No squad history registered yet.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs uppercase">Squad Name</TableHead>
                    <TableHead className="text-xs uppercase">Role / Status</TableHead>
                    <TableHead className="text-xs uppercase">Event Arena</TableHead>
                    <TableHead className="text-xs uppercase">Score</TableHead>
                    <TableHead className="text-xs uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squadHistory.map((hist) => {
                    const isCurrent = team?.id === hist.id;
                    const targetTeamId = hist.team_id || hist.id;
                    return (
                      <TableRow key={hist.id} className="border-border hover:bg-muted/20">
                        <TableCell>
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setSelectedHistoryTeamId(targetTeamId)}
                            title="Click to view analytics and performance for this squad"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: hist.color || '#00F0FF' }}
                            />
                            <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                              {hist.name}
                            </span>
                            {isCurrent ? (
                              <Badge variant="secondary" className="uppercase">
                                Active
                              </Badge>
                            ) : hist.action === 'DISBANDED' ? (
                              <Badge variant="outline" className="uppercase">
                                Disbanded
                              </Badge>
                            ) : hist.action === 'LEFT' ? (
                              <Badge variant="secondary" className="uppercase">
                                Left Team
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hist.is_my_creation || hist.role === 'LEADER' ? (
                            <Badge variant="outline" className="font-semibold gap-1">
                              <Crown className="h-3 w-3" /> Leader
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              Member
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {hist.event?.name || 'Default Arena'}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold text-primary">
                          {hist.score} PTS
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedHistoryTeamId(targetTeamId)}
                            className="h-7 w-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 ml-auto"
                            title="Open performance diagram and squad statistics"
                          >
                            <BarChart3 className="h-3.5 w-3.5" />
                            <span className="sr-only">Team Analytics</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. SQUAD / TEAM PERFORMANCE (IF USER CURRENTLY HAS AN ACTIVE TEAM) */}
      {team && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-outfit uppercase tracking-wider text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Squad Performance: {team.name}
            </h3>
            <Badge variant="outline" className="font-mono">
              Rank #{team.rank || '—'} • Total {team.score} PTS
            </Badge>
          </div>

          <TeamAnalytics team={team} currentUserId={currentUserId} />
        </div>
      )}

      {/* SQUAD PERFORMANCE DETAIL MODAL */}
      <TeamDetailModal
        teamId={selectedHistoryTeamId}
        open={Boolean(selectedHistoryTeamId)}
        onOpenChange={(open) => !open && setSelectedHistoryTeamId(null)}
      />
    </div>
  );
};
