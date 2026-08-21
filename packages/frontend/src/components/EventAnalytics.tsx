import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import {
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  Users,
  Award,
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

  const { event, summary, top_teams = [], challenges_overview = [], first_bloods = [] } = eventData;

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

  return (
    <div className="space-y-6">
      {/* 1. TOP SUMMARY HERO STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Total Teams */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Total Squads</span>
            <Users className="h-4 w-4 text-cyber-purple shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-foreground">{summary?.total_teams ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Squads</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
            {summary?.total_participants ?? 0} Operatives
          </div>
        </div>

        {/* Total Challenges */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Challenges</span>
            <Shield className="h-4 w-4 text-cyber-cyan shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-primary">{summary?.total_challenges ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Chals</span>
          </div>
        </div>

        {/* Arena Accuracy Rate */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Arena Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-emerald-400">{accuracyRate}%</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
            {correctSubmissions} Solves / {failedSubmissions} Missed
          </div>
        </div>

        {/* Total Submissions */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Submissions</span>
            <Activity className="h-4 w-4 text-primary shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-foreground">{totalSubmissions}</span>
            <span className="text-xs font-mono text-muted-foreground">Flags</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
            {correctSubmissions} Valid Solves
          </div>
        </div>

        {/* First Bloods */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">First Bloods</span>
            <Flame className="h-4 w-4 text-rose-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-rose-400">{summary?.first_bloods_count ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Strikes</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
            First Solves
          </div>
        </div>

        {/* Hints Used in Arena */}
        <div className="p-3 sm:p-3.5 rounded-xl bg-card border border-border relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Hints Used</span>
            <HelpCircle className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-outfit text-amber-400">{summary?.total_hints_used ?? 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Used</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground truncate">
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
        <div className="overflow-x-auto cyber-scrollbar-x -mx-1 px-1 pb-1">
          <TabsList className="bg-muted/60 p-1 border border-border inline-flex w-max min-w-full sm:w-auto h-auto flex-nowrap sm:flex-wrap gap-1 justify-start">
            <TabsTrigger value="overview" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase px-3 py-1.5 shrink-0 whitespace-nowrap">
              <BarChart3 className="h-3.5 w-3.5" /> <span>Overview & Charts</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase px-3 py-1.5 shrink-0 whitespace-nowrap">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" /> <span>Leaderboard ({top_teams.length})</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase px-3 py-1.5 shrink-0 whitespace-nowrap">
              <Shield className="h-3.5 w-3.5 text-cyber-cyan" /> <span>Challenges ({challenges_overview.length})</span>
            </TabsTrigger>
            <TabsTrigger value="firstbloods" className="text-xs flex items-center gap-1.5 font-bold font-outfit uppercase px-3 py-1.5 shrink-0 whitespace-nowrap">
              <Flame className="h-3.5 w-3.5 text-rose-400" /> <span>First Bloods ({first_bloods.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: OVERVIEW CHARTS */}
        <TabsContent value="overview" className="space-y-4">
          {/* Donut Chart: Event Submission Accuracy */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xs sm:text-sm font-bold font-outfit uppercase text-foreground truncate">
                      Arena Submission Accuracy
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs truncate">
                      Overall flag solves accuracy ratio across all competitors
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono font-bold text-xs self-start sm:self-center shrink-0">
                  {accuracyRate}% Accuracy
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 p-3.5 sm:p-6">
              {!hasSubmissions ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                  <Target className="h-7 w-7 mb-2 opacity-30" />
                  No flag submissions in this arena yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 max-w-xl mx-auto">
                  <div className="h-44 w-full sm:w-1/2 relative flex items-center justify-center min-w-0 overflow-hidden">
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

                  <div className="w-full sm:w-1/2 space-y-2.5 font-mono text-xs min-w-0">
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-bold text-[11px] truncate">Valid Flags</span>
                      </div>
                      <span className="font-bold text-foreground text-xs shrink-0 ml-2">
                        {correctSubmissions} ({hasSubmissions ? Math.round((correctSubmissions / totalSubmissions) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                        <span className="text-rose-400 font-bold text-[11px] truncate">Hit Missed Flags</span>
                      </div>
                      <span className="font-bold text-foreground text-xs shrink-0 ml-2">
                        {failedSubmissions} ({hasSubmissions ? Math.round((failedSubmissions / totalSubmissions) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="p-2 rounded bg-muted/40 border border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Total Submissions:</span>
                      <span className="font-bold text-foreground">{totalSubmissions} Attempts</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: TOP SQUAD LEADERBOARD */}
        <TabsContent value="leaderboard">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="h-4 w-4 text-primary shrink-0" />
                  <CardTitle className="text-xs sm:text-sm font-bold font-outfit uppercase text-foreground truncate">
                    Arena Squad Standings
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs self-start sm:self-center shrink-0">
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
                <div className="rounded-lg border border-border overflow-x-auto cyber-scrollbar-x">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="w-16 text-xs uppercase">Rank</TableHead>
                        <TableHead className="text-xs uppercase">Squad</TableHead>
                        <TableHead className="text-xs uppercase">Roster</TableHead>
                        <TableHead className="text-xs uppercase">Solves / Attempts</TableHead>
                        <TableHead className="text-xs uppercase">Accuracy</TableHead>
                        <TableHead className="text-xs uppercase">First Bloods</TableHead>
                        <TableHead className="text-right text-xs uppercase">Score</TableHead>
                        <TableHead className="text-xs uppercase text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top_teams.map((t: any) => (
                        <TableRow key={t.id} className="border-border hover:bg-muted/20">
                          <TableCell className="font-mono font-bold text-xs">
                            <Badge
                              variant="outline"
                              className={
                                t.rank === 1
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-mono font-bold'
                                  : t.rank === 2
                                  ? 'bg-slate-300/20 text-slate-200 border-slate-400/40 font-mono font-bold'
                                  : t.rank === 3
                                  ? 'bg-amber-700/20 text-amber-400 border-amber-700/40 font-mono font-bold'
                                  : 'font-mono text-muted-foreground'
                              }
                            >
                              #{t.rank}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-2 cursor-pointer group whitespace-nowrap"
                              onClick={() => setSelectedTeamId(t.id)}
                            >
                              <span className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.color || '#00F0FF' }} />
                              <span className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors">
                                {t.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {t.members_count} Operatives
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            <span className="text-emerald-400 font-bold">{t.solved_count}</span> / {t.total_attempts}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                            {t.accuracy_rate}%
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {t.first_bloods_count > 0 ? (
                              <span className="flex items-center gap-1 text-rose-400 font-bold">
                                <Flame className="h-3 w-3 text-rose-500" />
                                {t.first_bloods_count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-black text-primary text-sm whitespace-nowrap">
                            {t.score} PTS
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
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
            <CardHeader className="pb-3 border-b border-border/40 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Shield className="h-4 w-4 text-cyber-cyan shrink-0" />
                  <CardTitle className="text-xs sm:text-sm font-bold font-outfit uppercase text-foreground truncate">
                    Challenge Solve Rates ({challenges_overview.length})
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs self-start sm:self-center shrink-0">
                  {challenges_overview.length} Challenges
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-3 p-3.5 sm:p-6">
              {challenges_overview.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No challenges in this arena yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto cyber-scrollbar-x">
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
                          <TableCell className="font-bold text-xs sm:text-sm text-foreground whitespace-nowrap">
                            {ch.title}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className="font-mono">
                              {ch.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-primary text-xs whitespace-nowrap">
                            {ch.points} PTS
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            <span className="text-emerald-400 font-bold">{ch.total_solves} solves</span> / {ch.failed_attempts} hit missed
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-cyber-cyan whitespace-nowrap">
                            {ch.solve_rate}%
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {ch.first_blood ? (
                              <button
                                onClick={() => setSelectedTeamId(ch.first_blood.team_id)}
                                className="text-rose-400 hover:underline flex items-center gap-1 font-bold"
                              >
                                <Flame className="h-3 w-3 text-rose-500" />
                                {ch.first_blood.team_name}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
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
            <CardHeader className="pb-3 border-b border-border/40 p-3.5 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Flame className="h-4 w-4 text-rose-400 shrink-0" />
                  <CardTitle className="text-xs sm:text-sm font-bold font-outfit uppercase text-foreground truncate">
                    First Blood Strikes ({first_bloods.length})
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 p-3.5 sm:p-6">
              {first_bloods.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-muted-foreground">
                  No first bloods recorded yet.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-x-auto cyber-scrollbar-x">
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
