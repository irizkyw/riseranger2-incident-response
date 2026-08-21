import React, { useState, useMemo } from 'react';
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
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  Flame,
  Users,
  Award,
  Crown,
  Shield,
  Layers,
  Activity,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  PieChart as PieIcon,
  BarChart2,
  HelpCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatWIBDate } from '@/utils/date';

interface MemberStats {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    created_at: string;
  };
  score: number;
  solved_count: number;
  failed_count: number;
  total_attempts: number;
  accuracy_rate: number;
  contribution_percentage: number;
  joined_at: string;
  solved_challenges?: {
    id: string;
    title: string;
    category: string;
    points: number;
    base_points?: number;
    bonus_points?: number;
    is_first_blood?: boolean;
    solve_rank?: number;
    solved_at: string;
  }[];
}

interface CategoryBreakdown {
  category: string;
  count: number;
  points: number;
  percentage: number;
}

interface TeamAnalyticsProps {
  team: {
    id: string;
    name: string;
    score: number;
    rank?: number;
    color?: string;
    invite_code?: string;
    leader_id?: string;
    stats?: {
      total_submissions: number;
      correct_submissions: number;
      failed_submissions: number;
      accuracy_rate: number;
      first_blood_count: number;
      total_solves: number;
      hints_used_count?: number;
      hints_cost_total?: number;
    };
    members?: MemberStats[];
    category_breakdown?: CategoryBreakdown[];
    submissions?: any[];
  };
  currentUserId?: string;
}

const MEMBER_COLORS = [
  '#00F0FF', // Cyber Cyan
  '#A855F7', // Cyber Purple
  '#FACC15', // Neon Yellow
  '#FF007F', // Cyber Pink
  '#10B981', // Emerald
  '#38BDF8', // Sky Blue
  '#FB923C', // Orange
  '#EC4899', // Pink
  '#8B5CF6', // Violet
  '#06B6D4'  // Cyan
];

const CATEGORY_COLORS: Record<string, string> = {
  INCIDENT_RESPONSE: '#F43F5E',
  DIGITAL_FORENSICS: '#00F0FF',
  WEB_EXPLOITATION: '#A855F7',
  NETWORK_ANALYSIS: '#10B981',
  REVERSE_ENGINEERING: '#FACC15',
  CRYPTOGRAPHY: '#38BDF8',
  MISC: '#FB923C'
};

const ChartCustomTooltip = ({ active, payload }: any) => {
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



const CategoryBarTooltip = ({ active, payload, label }: any) => {
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

const calculateLargestRemainderPercentages = (
  values: number[],
  targetSum: number = 100
): number[] => {
  if (values.length === 0) return [];
  const positiveValues = values.map((v) => Math.max(0, v || 0));
  const total = positiveValues.reduce((sum, v) => sum + v, 0);

  if (total <= 0) {
    return values.map(() => 0);
  }

  const raw = positiveValues.map((v) => (v / total) * targetSum);
  const floors = raw.map(Math.floor);
  const currentSum = floors.reduce((a, b) => a + b, 0);
  const remainderNeeded = targetSum - currentSum;

  const remainders = raw
    .map((r, index) => ({
      index,
      remainder: r - floors[index]
    }))
    .sort((a, b) => b.remainder - a.remainder);

  const result = [...floors];
  for (let i = 0; i < remainderNeeded && i < remainders.length; i++) {
    result[remainders[i].index]++;
  }

  return result;
};

export const TeamAnalytics: React.FC<TeamAnalyticsProps> = ({ team, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'categories'>('overview');

  const stats = team.stats || {
    total_submissions: 0,
    correct_submissions: 0,
    failed_submissions: 0,
    accuracy_rate: 0,
    first_blood_count: 0,
    total_solves: 0,
    hints_used_count: 0,
    hints_cost_total: 0
  };

  const members = team.members || [];
  const categoryBreakdown = team.category_breakdown || [];

  // Calculate normalized percentages using Largest Remainder (guaranteed 100% total sum)
  const memberScores = useMemo(() => members.map((m) => m.score || 0), [members]);
  const normalizedPercentages = useMemo(() => {
    return calculateLargestRemainderPercentages(memberScores, 100);
  }, [memberScores]);

  // Data for Success vs Fail Donut Chart
  const accuracyData = [
    { name: 'Solves (Valid Flags)', value: stats.correct_submissions, color: '#10B981' },
    { name: 'Hit Missed (Wrong Flags)', value: stats.failed_submissions, color: '#F43F5E' }
  ];
  const hasSubmissions = stats.total_submissions > 0;

  // Data for Category Mastery Chart
  const categoryChartData = categoryBreakdown.map((c) => ({
    category: c.category.replace(/_/g, ' '),
    rawCategory: c.category,
    points: c.points,
    count: c.count,
    percentage: c.percentage,
    color: CATEGORY_COLORS[c.category] || '#00F0FF'
  }));

  return (
    <div className="space-y-4 sm:space-y-5 max-w-full overflow-hidden">
      {/* 1. TOP METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {/* Total Score & Rank */}
        <div className="p-3 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[92px] min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Team Score</span>
            <Trophy className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          </div>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-outfit text-foreground truncate">{team.score}</span>
            <span className="text-[10px] font-mono text-primary font-bold shrink-0">PTS</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0 h-4">
              Rank #{team.rank || '—'}
            </Badge>
          </div>
        </div>

        {/* Submission Accuracy Rate */}
        <div className="p-3 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[92px] min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Accuracy</span>
            <Target className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          </div>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-outfit text-emerald-400 truncate">{stats.accuracy_rate}%</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {stats.correct_submissions} / {stats.total_submissions} Flags
          </div>
        </div>

        {/* Challenges Solved */}
        <div className="p-3 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[92px] min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Solves</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-cyber-cyan shrink-0" />
          </div>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-outfit text-foreground truncate">{stats.total_solves}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">Solved</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {stats.total_submissions} Attempts
          </div>
        </div>

        {/* Hints Used */}
        <div className="p-3 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[92px] min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Hints Used</span>
            <HelpCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-outfit text-amber-400 truncate">{stats.hints_used_count ?? 0}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">Used</span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {(stats.hints_cost_total ?? 0) > 0 ? (
              <span className="text-rose-400 font-semibold">-{stats.hints_cost_total} PTS</span>
            ) : (
              <span>0 PTS</span>
            )}
          </div>
        </div>

        {/* Total Operatives */}
        <div className="p-3 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[92px] min-w-0 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">Operatives</span>
            <Users className="h-3.5 w-3.5 text-cyber-purple shrink-0" />
          </div>
          <div className="my-1 flex items-baseline gap-1">
            <span className="text-lg sm:text-2xl font-black font-outfit text-foreground truncate">{members.length}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">Members</span>
          </div>
          <div className="flex items-center gap-1 truncate">
            {stats.first_blood_count > 0 ? (
              <Badge variant="outline" className="font-mono gap-1 text-[9px] px-1.5 py-0 h-4 truncate">
                <Flame className="h-2.5 w-2.5 text-rose-400 shrink-0" /> {stats.first_blood_count} First Blood
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono truncate">Squad Registered</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABBED ANALYTICS VIEW - 100% Symmetric 3-Column Grid */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4 w-full max-w-full">
        <TabsList className="bg-muted/40 p-1 border border-border w-full grid grid-cols-3 h-auto min-h-10 gap-1 rounded-xl">
          <TabsTrigger
            value="overview"
            className="w-full min-w-0 px-1 sm:px-3 py-2 text-[10.5px] sm:text-xs font-bold font-outfit uppercase flex items-center justify-center gap-1 data-[state=active]:bg-cyber-cyan/20 data-[state=active]:text-cyber-cyan rounded-lg truncate"
          >
            <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="w-full min-w-0 px-1 sm:px-3 py-2 text-[10.5px] sm:text-xs font-bold font-outfit uppercase flex items-center justify-center gap-1 data-[state=active]:bg-cyber-cyan/20 data-[state=active]:text-cyber-cyan rounded-lg truncate"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-cyber-purple" />
            <span className="truncate">Members ({members.length})</span>
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="w-full min-w-0 px-1 sm:px-3 py-2 text-[10.5px] sm:text-xs font-bold font-outfit uppercase flex items-center justify-center gap-1 data-[state=active]:bg-cyber-cyan/20 data-[state=active]:text-cyber-cyan rounded-lg truncate"
          >
            <Layers className="h-3.5 w-3.5 shrink-0 text-cyber-cyan" />
            <span className="truncate">Categories ({categoryBreakdown.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW CHARTS */}
        <TabsContent value="overview" className="space-y-4 m-0">
          {/* Submission Success vs Fail Donut Chart */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/40 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                    <Target className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-xs sm:text-sm font-bold font-outfit uppercase text-foreground truncate">
                      Solves vs Hit Missed Breakdown
                    </CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs truncate">
                      Flag submission accuracy ratio
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="font-mono font-bold text-xs self-start sm:self-center shrink-0">
                  {stats.accuracy_rate}% Accuracy
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 p-3.5 sm:p-6">
              {!hasSubmissions ? (
                <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                  <Target className="h-7 w-7 mb-2 opacity-30" />
                  No flag submissions sent by this squad yet.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6 max-w-xl mx-auto">
                  <div className="h-44 w-full sm:w-1/2 relative flex items-center justify-center min-w-0 overflow-hidden">
                    {/* Center Label (Layered behind tooltip) */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none">
                      <span className="text-lg font-black font-outfit text-foreground">{stats.accuracy_rate}%</span>
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
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartCustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
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
                        {stats.correct_submissions} ({hasSubmissions ? Math.round((stats.correct_submissions / stats.total_submissions) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
                        <span className="text-rose-400 font-bold text-[11px] truncate">Hit Missed Flags</span>
                      </div>
                      <span className="font-bold text-foreground text-xs shrink-0 ml-2">
                        {stats.failed_submissions} ({hasSubmissions ? Math.round((stats.failed_submissions / stats.total_submissions) * 100) : 0}%)
                      </span>
                    </div>

                    <div className="p-2 rounded bg-muted/40 border border-border flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Total Submissions:</span>
                      <span className="font-bold text-foreground">{stats.total_submissions} Attempts</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: DETAILED MEMBERS LIST WITH SCORES & PROGRESS */}
        <TabsContent value="members" className="space-y-4 m-0 min-w-0">
          <Card className="border-border bg-card shadow-sm min-w-0 overflow-hidden">
            <CardHeader className="border-b border-border/40 pb-3 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-bold font-outfit uppercase text-foreground flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Users className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">Operative Roster</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs truncate">
                    Individual scores and accuracy per operative
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs self-start sm:self-center shrink-0">
                  {members.length} Operatives
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 p-3 sm:p-5 min-w-0">
              {/* Member Contribution Bar Visualizer */}
              {team.score > 0 && (
                <div className="space-y-1.5 p-2.5 sm:p-3 rounded-lg bg-muted/20 border border-border min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-mono gap-2 min-w-0">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold truncate">Team Point Contribution:</span>
                    <span className="text-foreground font-bold shrink-0">{team.score} PTS Total</span>
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60">
                    {members.map((m, idx) => {
                      const pct = normalizedPercentages[idx] ?? m.contribution_percentage ?? (team.score > 0 ? (m.score / team.score) * 100 : 0);
                      if (pct <= 0) return null;
                      const col = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                      return (
                        <div
                          key={m.id}
                          style={{ width: `${pct}%`, backgroundColor: col }}
                          className="h-full transition-all duration-300 relative group"
                          title={`@${m.user.username}: ${m.score} PTS (${pct}% Contribution)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 pt-1 min-w-0">
                    {members.map((m, idx) => {
                      const pct = normalizedPercentages[idx] ?? m.contribution_percentage ?? 0;
                      return (
                        <div key={m.id} className="flex items-center gap-1 text-[10px] font-mono min-w-0">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }} />
                          <span className="text-muted-foreground truncate">@{m.user.username}:</span>
                          <span className="font-bold text-foreground shrink-0">{m.score} pts ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Members Cards / List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
                {members.map((member, idx) => {
                  const isLeader = team.leader_id === member.user.id;
                  const isMe = currentUserId === member.user.id;
                  const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                  const memberPct = team.score > 0 ? (normalizedPercentages[idx] ?? member.contribution_percentage ?? 0) : 0;

                  return (
                    <div
                      key={member.id}
                      className={`p-3 sm:p-4 rounded-xl border transition-all min-w-0 overflow-hidden ${isMe ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-muted/10 hover:bg-muted/20'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-2 sm:gap-3 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="h-8 w-8 sm:h-10 sm:w-10 ring-1 ring-border shrink-0">
                            <AvatarFallback className="font-mono font-bold text-xs" style={{ backgroundColor: `${memberColor}20`, color: memberColor }}>
                              {member.user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-bold text-foreground text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">@{member.user.username}</span>
                              {isMe && (
                                <Badge variant="outline" className="px-1 py-0 h-4 text-[9px]">
                                  YOU
                                </Badge>
                              )}
                              {isLeader && (
                                <Badge variant="outline" className="px-1 py-0 h-4 flex items-center gap-0.5 text-[9px]">
                                  <Crown className="h-2.5 w-2.5 text-amber-400" /> LEADER
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono truncate block">
                              Joined {formatWIBDate(member.joined_at)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <div className="text-lg sm:text-xl font-black font-outfit text-primary tracking-tight">
                            {member.score || 0} <span className="text-[10px] sm:text-xs font-mono font-normal text-muted-foreground">PTS</span>
                          </div>
                        </div>
                      </div>

                      {/* Member Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-border/40 text-center font-mono min-w-0">
                        <div className="p-1.5 rounded bg-primary/5 border border-primary/20 min-w-0">
                          <span className="text-[9px] text-muted-foreground block uppercase truncate">Contribution</span>
                          <span className="text-xs font-bold text-primary flex items-center justify-center truncate">
                            {memberPct}%
                          </span>
                        </div>

                        <div className="p-1.5 rounded bg-muted/30 border border-border/50 min-w-0">
                          <span className="text-[9px] text-muted-foreground block uppercase truncate">Solves</span>
                          <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 truncate">
                            <CheckCircle2 className="h-3 w-3 shrink-0" /> {member.solved_count || 0}
                          </span>
                        </div>

                        <div className="p-1.5 rounded bg-muted/30 border border-border/50 min-w-0">
                          <span className="text-[9px] text-muted-foreground block uppercase truncate">Hit Missed</span>
                          <span className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1 truncate">
                            <XCircle className="h-3 w-3 shrink-0" /> {member.failed_count || 0}
                          </span>
                        </div>

                        <div className="p-1.5 rounded bg-muted/30 border border-border/50 min-w-0">
                          <span className="text-[9px] text-muted-foreground block uppercase truncate">Accuracy</span>
                          <span className="text-xs font-bold text-cyber-cyan flex items-center justify-center gap-1 truncate">
                            <Target className="h-3 w-3 shrink-0" /> {member.accuracy_rate || 0}%
                          </span>
                        </div>
                      </div>

                      {/* Solved Challenges Chips by this Member */}
                      {member.solved_challenges && member.solved_challenges.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/30">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Solved Challenges ({member.solved_challenges.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {member.solved_challenges.map((c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="font-mono py-0.5 px-1.5 text-[10px] hover:bg-primary/10 transition-colors flex items-center gap-1 max-w-full truncate"
                              >
                                <span className="text-emerald-400 shrink-0">✓</span>
                                <span className="truncate">{c.title}</span>
                                <span className="text-primary font-bold shrink-0">+{c.points}</span>
                                {(c.is_first_blood || c.solve_rank === 1) && (
                                  <span
                                    className="text-[8px] font-mono font-black text-amber-300 bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/40 whitespace-nowrap flex items-center gap-0.5"
                                    title={`First Blood (+${c.bonus_points ?? 50} Bonus)`}
                                  >
                                    👑 1st
                                  </span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: CATEGORY MASTERY BREAKDOWN */}
        <TabsContent value="categories" className="space-y-4 m-0">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 pb-3 p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-sm sm:text-base font-bold font-outfit uppercase text-foreground flex items-center gap-1.5 sm:gap-2">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">Challenge Category Distribution</span>
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs truncate">
                    Points and solves breakdown across CTF categories
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] sm:text-xs self-start sm:self-center shrink-0">
                  {categoryBreakdown.length} Categories Mastered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-5 pt-4">
              {categoryBreakdown.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs font-mono">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No categories solved by this squad yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Bar Chart */}
                  <div className="h-52 sm:h-56 w-full min-w-0 overflow-hidden">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis
                          dataKey="category"
                          stroke="#64748B"
                          fontSize={10}
                          tickLine={false}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                        />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                        <Tooltip content={<CategoryBarTooltip />} />
                        <Bar dataKey="points" radius={[4, 4, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 pt-1">
                    {categoryBreakdown.map((cat, idx) => {
                      const color = CATEGORY_COLORS[cat.category] || '#00F0FF';
                      return (
                        <div key={idx} className="p-2.5 sm:p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2.5 w-2.5 rounded-md shrink-0" style={{ backgroundColor: color }} />
                            <div className="min-w-0">
                              <span className="font-bold text-xs text-foreground uppercase block font-outfit truncate">
                                {cat.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate block">
                                {cat.count} Solved
                              </span>
                            </div>
                          </div>
                          <div className="text-right font-mono shrink-0 ml-2">
                            <span className="font-bold text-primary text-xs block">{cat.points} pts</span>
                            <span className="text-[9px] text-muted-foreground">{cat.percentage}% Total</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
