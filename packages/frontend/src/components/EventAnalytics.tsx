import React, { useState } from 'react';
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
  Shield,
  Radio,
  BarChart3,
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { formatWIBTime } from '@/utils/date';

interface EventAnalyticsProps {
  eventData: any;
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

const EventAccuracyTooltip = ({ active, payload }: any) => {
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

const EventCategoryTooltip = ({ active, payload, label }: any) => {
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

export const EventAnalytics: React.FC<EventAnalyticsProps> = ({ eventData }) => {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'challenges' | 'firstbloods'>('overview');

  if (!eventData) {
    return (
      <div className="py-12 text-center text-xs font-mono text-muted-foreground animate-pulse">
        Loading event analytics...
      </div>
    );
  }

  const { event, summary, category_breakdown = [], top_teams = [], challenges_overview = [], first_bloods = [] } = eventData;

  const totalSubmissions = summary?.total_submissions || 0;
  const correctSubmissions = summary?.correct_submissions || 0;
  const failedSubmissions = summary?.failed_submissions || 0;
  const accuracyRate = summary?.accuracy_rate || 0;

  // Donut chart accuracy data
  const accuracyData = [
    { name: 'Solves (Valid Flags)', value: correctSubmissions, color: '#10B981' },
    { name: 'Hit Missed (Wrong Flags)', value: failedSubmissions, color: '#F43F5E' }
  ];
  const hasSubmissions = totalSubmissions > 0;

  // Bar chart category data
  const categoryChartData = category_breakdown.map((c: any) => ({
    category: c.category.replace(/_/g, ' '),
    rawCategory: c.category,
    points: c.total_points,
    challenge_count: c.challenge_count,
    solve_count: c.solve_count,
    accuracy_rate: c.accuracy_rate,
    color: CATEGORY_COLORS[c.category] || '#00F0FF'
  }));

  return (
    <div className="space-y-6">
      {/* 1. HERO EVENT SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Teams */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Squads</span>
            <Users className="h-4 w-4 text-cyber-purple" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-foreground">{summary?.total_teams ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Squads</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {summary?.total_participants ?? 0} Operatives
          </div>
        </div>

        {/* Total Challenges */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Challenges</span>
            <Shield className="h-4 w-4 text-cyber-cyan" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-primary">{summary?.total_challenges ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Solved</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground font-bold text-primary">
            {summary?.total_available_points ?? 0} Total PTS
          </div>
        </div>

        {/* Arena Accuracy Rate */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Arena Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-emerald-400">{accuracyRate}%</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {correctSubmissions} Solves / {failedSubmissions} Hit Missed
          </div>
        </div>

        {/* Total Submissions */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Submissions</span>
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-foreground">{totalSubmissions}</span>
            <span className="text-xs font-mono text-muted-foreground">Flags</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {correctSubmissions} Valid Solves
          </div>
        </div>

        {/* First Bloods */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">First Bloods</span>
            <Flame className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-rose-400">{summary?.first_bloods_count ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">👑</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            First Solves
          </div>
        </div>

        {/* Hints Used in Arena */}
        <div className="p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hints Used</span>
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-amber-400">{summary?.total_hints_used ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Used</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {(summary?.total_hints_cost ?? 0) > 0 ? (
              <span className="text-rose-400 font-semibold">-{summary?.total_hints_cost} PTS Penalty</span>
            ) : (
              <span className="text-slate-400">0 PTS Penalty</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABS: OVERVIEW DIAGRAMS, LEADERBOARD, CHALLENGES, FIRST BLOODS */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 border border-border flex flex-wrap">
          <TabsTrigger value="overview" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase">
            <BarChart3 className="h-3.5 w-3.5" /> Overview & Charts
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase">
            <Trophy className="h-3.5 w-3.5 text-yellow-400" /> Top Squad Leaderboard ({top_teams.length})
          </TabsTrigger>
          <TabsTrigger value="challenges" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase">
            <Shield className="h-3.5 w-3.5 text-cyber-cyan" /> Challenges Overview ({challenges_overview.length})
          </TabsTrigger>
          <TabsTrigger value="firstbloods" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase">
            <Flame className="h-3.5 w-3.5 text-rose-400" /> First Bloods ({first_bloods.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW CHARTS */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut Chart: Event Submission Accuracy */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                        Arena Submission Accuracy
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Overall flag solves accuracy ratio across all competitors
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono font-bold">
                    {accuracyRate}% Accuracy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasSubmissions ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                    <Target className="h-7 w-7 mb-2 opacity-30" />
                    No flag submissions in this arena yet.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="h-44 w-full sm:w-1/2 relative flex items-center justify-center">
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
                              <Cell key={`cell-event-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip content={<EventAccuracyTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full sm:w-1/2 space-y-2.5 font-mono text-xs">
                      <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-bold text-[11px]">Valid Flags</span>
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          {correctSubmissions} ({hasSubmissions ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0}%)
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                          <span className="text-rose-400 font-bold text-[11px]">Hit Missed Flags</span>
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          {failedSubmissions} ({hasSubmissions ? Math.round((failedSubmissions / totalSubmissions) * 100) : 0}%)
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

            {/* Bar Chart: Category Breakdown */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/20">
                      <Layers className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                        Category Breakdown & Points Available
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Distribution of points and challenges per category in this arena
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="py-0 px-2 font-mono h-5 leading-none">
                    {category_breakdown.length} Categories
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {category_breakdown.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                    <Layers className="h-7 w-7 mb-2 opacity-30" />
                    No challenge categories registered in this arena yet.
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
                          <Tooltip content={<EventCategoryTooltip />} />
                          <Bar dataKey="points" radius={[3, 3, 0, 0]}>
                            {categoryChartData.map((entry: any, index: number) => (
                              <Cell key={`bar-cat-event-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {category_breakdown.map((cat: any, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="font-mono py-0.5 px-2"
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full mr-1"
                            style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#00F0FF' }}
                          />
                          {cat.category.replace(/_/g, ' ')}: <strong className="ml-1 text-primary">{cat.total_points} pts</strong> ({cat.challenge_count} challenges)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: TOP SQUAD LEADERBOARD */}
        <TabsContent value="leaderboard">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400" />
                  <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                    Arena Squad Standings
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono">
                  {top_teams.length} Squads Registered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {top_teams.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No squads registered in this arena yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs uppercase w-14">Rank</TableHead>
                        <TableHead className="text-xs uppercase">Squad Name</TableHead>
                        <TableHead className="text-xs uppercase">Operatives</TableHead>
                        <TableHead className="text-xs uppercase">Solves / Attempts</TableHead>
                        <TableHead className="text-xs uppercase">Accuracy</TableHead>
                        <TableHead className="text-xs uppercase">First Bloods</TableHead>
                        <TableHead className="text-xs uppercase text-right">Total Score</TableHead>
                        <TableHead className="text-xs uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top_teams.map((t: any) => (
                        <TableRow key={t.id} className="border-border hover:bg-muted/20">
                          <TableCell className="font-mono font-bold text-xs">
                            {t.rank === 1 ? '🥇 #1' : t.rank === 2 ? '🥈 #2' : t.rank === 3 ? '🥉 #3' : `#${t.rank}`}
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-2 cursor-pointer group"
                              onClick={() => setSelectedTeamId(t.id)}
                            >
                              <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.color || '#00F0FF' }} />
                              <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                                {t.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {t.members_count} Operatives
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            <span className="text-emerald-400 font-bold">{t.solved_count}</span> / {t.total_attempts}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-emerald-400">
                            {t.accuracy_rate}%
                          </TableCell>
                          <TableCell className="text-xs font-mono text-rose-400 font-bold">
                            {t.first_bloods_count > 0 ? `👑 ${t.first_bloods_count}` : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-primary text-sm">
                            {t.score} PTS
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedTeamId(t.id)}
                              className="h-7 w-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 ml-auto"
                              title="Inspect Squad Analytics & Diagram"
                            >
                              <BarChart3 className="h-3.5 w-3.5" />
                              <span className="sr-only">Inspect</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CHALLENGES OVERVIEW */}
        <TabsContent value="challenges">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cyber-cyan" />
                  <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                    Challenge Solve Rates ({challenges_overview.length})
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono">
                  {summary?.total_available_points || 0} Total PTS
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {challenges_overview.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No challenges in this arena yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs uppercase">Challenge Title</TableHead>
                        <TableHead className="text-xs uppercase">Category</TableHead>
                        <TableHead className="text-xs uppercase">Points</TableHead>
                        <TableHead className="text-xs uppercase">Solves / Hit Missed</TableHead>
                        <TableHead className="text-xs uppercase">Solve Rate</TableHead>
                        <TableHead className="text-xs uppercase">First Blood</TableHead>
                        <TableHead className="text-xs uppercase text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {challenges_overview.map((ch: any) => (
                        <TableRow key={ch.id} className="border-border hover:bg-muted/20">
                          <TableCell className="font-bold text-xs sm:text-sm text-foreground">
                            {ch.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {ch.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary text-xs">
                            {ch.points} PTS
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            <span className="text-emerald-400 font-bold">{ch.total_solves} solves</span> / {ch.failed_attempts} hit missed
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-cyber-cyan">
                            {ch.solve_rate}%
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {ch.first_blood ? (
                              <button
                                onClick={() => setSelectedTeamId(ch.first_blood.team_id)}
                                className="text-rose-400 hover:underline flex items-center gap-1 font-bold"
                              >
                                👑 {ch.first_blood.team_name}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {ch.is_active ? (
                              <Badge variant="secondary" className="uppercase">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="uppercase">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: FIRST BLOODS */}
        <TabsContent value="firstbloods">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-400" />
                  <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                    First Blood Strikes ({first_bloods.length})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {first_bloods.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No first bloods claimed in this arena yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-xs uppercase">Challenge</TableHead>
                        <TableHead className="text-xs uppercase">Category</TableHead>
                        <TableHead className="text-xs uppercase">Points</TableHead>
                        <TableHead className="text-xs uppercase">First Blood Claimed By</TableHead>
                        <TableHead className="text-xs uppercase text-right">Strike Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {first_bloods.map((fb: any) => (
                        <TableRow key={fb.id} className="border-border hover:bg-muted/20">
                          <TableCell className="font-bold text-xs sm:text-sm text-foreground">
                            {fb.challenge_title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {fb.challenge_category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary text-xs">
                            +{fb.challenge_points} PTS
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedTeamId(fb.team_id)}
                              className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors"
                            >
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fb.team_color || '#F43F5E' }} />
                              <span>👑 {fb.team_name}</span>
                            </button>
                          </TableCell>
                          <TableCell className="text-right text-xs font-mono text-muted-foreground">
                            {formatWIBTime(fb.achieved_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TEAM DETAIL MODAL (WHEN CLICKING SQUADS INSIDE EVENT ANALYTICS) */}
      <TeamDetailModal
        teamId={selectedTeamId}
        open={Boolean(selectedTeamId)}
        onOpenChange={(open) => !open && setSelectedTeamId(null)}
      />
    </div>
  );
};
