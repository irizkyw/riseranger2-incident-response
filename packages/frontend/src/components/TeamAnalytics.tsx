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

const MemberScoreTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-slate-950/95 border border-slate-700 px-3 py-2 rounded-lg shadow-2xl font-mono text-xs z-[9999] pointer-events-none whitespace-nowrap min-w-max backdrop-blur-md">
        <div className="flex items-center gap-2">
          {item.payload?.color && (
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.payload.color }} />
          )}
          <span className="text-[#FFFFFF] font-bold">{item.name}</span>
          <span className="text-[#00F0FF] font-extrabold">: {item.value} PTS</span>
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

  // Data for Success vs Fail Donut Chart
  const accuracyData = [
    { name: 'Solves (Valid Flags)', value: stats.correct_submissions, color: '#10B981' },
    { name: 'Hit Missed (Wrong Flags)', value: stats.failed_submissions, color: '#F43F5E' }
  ];
  const hasSubmissions = stats.total_submissions > 0;

  // Data for Member Contribution Pie / Bar Chart
  const memberContributionData = members.map((m, idx) => ({
    name: `@${m.user.username}`,
    score: m.score || 0,
    solves: m.solved_count || 0,
    accuracy: m.accuracy_rate || 0,
    contribution: m.contribution_percentage || 0,
    color: MEMBER_COLORS[idx % MEMBER_COLORS.length]
  }));

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
    <div className="space-y-6">
      {/* 1. TOP METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Score & Rank */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Total Team Score</span>
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-foreground">{team.score}</span>
            <span className="text-xs font-mono text-primary font-bold">PTS</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="font-mono">
              Rank #{team.rank || '—'}
            </Badge>
          </div>
        </div>

        {/* Submission Accuracy Rate */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Flag Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-emerald-400">{stats.accuracy_rate}%</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            <span className="text-emerald-400 font-bold">{stats.correct_submissions}</span> Solves / <span className="text-rose-400 font-bold">{stats.failed_submissions}</span> Hit Missed
          </div>
        </div>

        {/* Solved Challenges & Submissions */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Challenges Solved</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-primary">{stats.correct_submissions}</span>
            <span className="text-xs text-muted-foreground">Solved</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            Out of {stats.total_submissions} total attempts
          </div>
        </div>

        {/* Hints Used */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Hints Used</span>
            <HelpCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-amber-400">{stats.hints_used_count || 0}</span>
            <span className="text-xs font-mono text-muted-foreground">Used</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-muted-foreground">
            {(stats.hints_cost_total || 0) > 0 ? (
              <span className="text-rose-400 font-semibold">-{stats.hints_cost_total} PTS Penalty</span>
            ) : (
              <span className="text-slate-400">0 PTS Penalty</span>
            )}
          </div>
        </div>

        {/* Squad Members & First Bloods */}
        <div className="p-3.5 rounded-xl bg-card border border-border/80 relative overflow-hidden shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Squad Operatives</span>
            <Users className="h-4 w-4 text-cyber-purple" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black font-outfit text-foreground">{members.length}</span>
            <span className="text-xs text-muted-foreground">Members</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {stats.first_blood_count > 0 ? (
              <Badge variant="outline" className="font-mono gap-1">
                <Flame className="h-3 w-3 text-rose-400" /> {stats.first_blood_count} First Blood
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground font-mono">Squad Registered</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABBED ANALYTICS VIEW */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="bg-muted/40 p-1 border border-border w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="gap-1 text-[11px] sm:text-xs font-bold font-outfit uppercase px-1 sm:px-3">
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Charts</span>
            <span className="hidden sm:inline">Overview & Charts</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1 text-[11px] sm:text-xs font-bold font-outfit uppercase px-1 sm:px-3">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Members</span>
            <span className="hidden sm:inline">Member Scores ({members.length})</span>
            <span className="sm:hidden text-[10px] opacity-70">({members.length})</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1 text-[11px] sm:text-xs font-bold font-outfit uppercase px-1 sm:px-3">
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden xs:inline sm:hidden">Cats</span>
            <span className="hidden sm:inline">Categories ({categoryBreakdown.length})</span>
            <span className="sm:hidden text-[10px] opacity-70">({categoryBreakdown.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW CHARTS */}
        <TabsContent value="overview" className="space-y-4 m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Submission Success vs Fail Donut Chart */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Target className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                        Solves vs Hit Missed Breakdown
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Accuracy ratio of flags submitted by squad members
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono font-bold">
                    {stats.accuracy_rate}% Accuracy
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {!hasSubmissions ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                    <Target className="h-8 w-8 mb-2 opacity-30" />
                    No flag submissions sent by this squad yet.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="h-52 w-full sm:w-1/2 relative flex items-center justify-center">
                      {/* Center Label (Layered behind tooltip) */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none">
                        <span className="text-xl font-black font-outfit text-foreground">{stats.accuracy_rate}%</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">Accuracy</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                        <PieChart>
                          <Pie
                            data={accuracyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
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

                    <div className="w-full sm:w-1/2 space-y-3 font-mono text-xs">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-emerald-400 font-bold">Valid Flags (Solves)</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {stats.correct_submissions} ({hasSubmissions ? Math.round((stats.correct_submissions / stats.total_submissions) * 100) : 0}%)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="text-rose-400 font-bold">Hit Missed Flags</span>
                        </div>
                        <span className="font-bold text-foreground">
                          {stats.failed_submissions} ({hasSubmissions ? Math.round((stats.failed_submissions / stats.total_submissions) * 100) : 0}%)
                        </span>
                      </div>

                      <div className="p-2 rounded bg-muted/40 border border-border flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Total Attempts:</span>
                        <span className="font-bold text-foreground">{stats.total_submissions} Attempts</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Member Score Contribution Donut/Bar Chart */}
            <Card className="border-border bg-card shadow-sm">
              <CardHeader className="pb-2 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20">
                      <PieIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold font-outfit uppercase text-foreground">
                        Member Score Contribution
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Point percentage contributed by each squad operative
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    {members.length} Operatives
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {members.length === 0 || team.score === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-center text-muted-foreground text-xs font-mono">
                    <Users className="h-8 w-8 mb-2 opacity-30" />
                    No score contribution from members yet.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="h-52 w-full sm:w-1/2 relative flex items-center justify-center">
                      {/* Center Label (Layered behind tooltip) */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 select-none">
                        <span className="text-lg font-black font-outfit text-foreground">{team.score}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">Total PTS</span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%" className="relative z-10">
                        <PieChart>
                          <Pie
                            data={memberContributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={74}
                            paddingAngle={3}
                            dataKey="score"
                          >
                            {memberContributionData.map((entry, index) => (
                              <Cell key={`cell-member-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip content={<MemberScoreTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="w-full sm:w-1/2 space-y-2 max-h-52 overflow-y-auto pr-1">
                      {memberContributionData.map((m, idx) => (
                        <div key={idx} className="p-2 rounded bg-muted/30 border border-border flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                            <span className="font-bold text-foreground truncate max-w-[90px]">{m.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-right shrink-0">
                            <span className="font-bold text-primary">{m.score} pts</span>
                            <Badge variant="outline" className="px-1.5 py-0 h-4 font-normal">
                              {m.contribution}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: DETAILED MEMBERS LIST WITH SCORES & PROGRESS */}
        <TabsContent value="members" className="space-y-4 m-0">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border/40 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-outfit uppercase text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Operative Roster & Score Contribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Flag submission performance, individual scores, and accuracy per operative
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {members.length} Total Operatives
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Member Contribution Bar Visualizer */}
              {team.score > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg bg-muted/20 border border-border">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted-foreground uppercase text-[10px] font-bold">Team Point Distribution:</span>
                    <span className="text-foreground font-bold">{team.score} PTS Total</span>
                  </div>
                  <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60">
                    {members.map((m, idx) => {
                      const pct = m.contribution_percentage || (team.score > 0 ? (m.score / team.score) * 100 : 0);
                      if (pct <= 0) return null;
                      const col = MEMBER_COLORS[idx % MEMBER_COLORS.length];
                      return (
                        <div
                          key={m.id}
                          style={{ width: `${pct}%`, backgroundColor: col }}
                          className="h-full transition-all duration-300 relative group"
                          title={`@${m.user.username}: ${m.score} PTS (${Math.round(pct)}%)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {members.map((m, idx) => (
                      <div key={m.id} className="flex items-center gap-1.5 text-[10px] font-mono">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MEMBER_COLORS[idx % MEMBER_COLORS.length] }} />
                        <span className="text-muted-foreground">@{m.user.username}:</span>
                        <span className="font-bold text-foreground">{m.score} pts ({m.contribution_percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members Cards / List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {members.map((member, idx) => {
                  const isLeader = team.leader_id === member.user.id;
                  const isMe = currentUserId === member.user.id;
                  const memberColor = MEMBER_COLORS[idx % MEMBER_COLORS.length];

                  return (
                    <div
                      key={member.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isMe ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30' : 'border-border bg-muted/10 hover:bg-muted/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 ring-1 ring-border">
                            <AvatarFallback className="font-mono font-bold text-xs" style={{ backgroundColor: `${memberColor}20`, color: memberColor }}>
                              {member.user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground text-sm">@{member.user.username}</span>
                              {isMe && (
                                <Badge variant="outline" className="px-1 py-0 h-4">
                                  YOU
                                </Badge>
                              )}
                              {isLeader && (
                                <Badge variant="outline" className="px-1.5 py-0 h-4 flex items-center gap-1">
                                  <Crown className="h-2.5 w-2.5 text-amber-400" /> LEADER
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              Joined {new Date(member.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-black font-outfit text-primary">
                            {member.score || 0} <span className="text-xs font-normal text-muted-foreground">PTS</span>
                          </div>
                          <Badge variant="outline" className="font-mono">
                            {member.contribution_percentage || 0}% Team
                          </Badge>
                        </div>
                      </div>

                      {/* Member Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40 text-center font-mono">
                        <div className="p-1.5 rounded bg-muted/30 border border-border/50">
                          <span className="text-[9px] text-muted-foreground block uppercase">Solves</span>
                          <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> {member.solved_count || 0}
                          </span>
                        </div>

                        <div className="p-1.5 rounded bg-muted/30 border border-border/50">
                          <span className="text-[9px] text-muted-foreground block uppercase">Hit Missed</span>
                          <span className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1">
                            <XCircle className="h-3 w-3" /> {member.failed_count || 0}
                          </span>
                        </div>

                        <div className="p-1.5 rounded bg-muted/30 border border-border/50">
                          <span className="text-[9px] text-muted-foreground block uppercase">Accuracy</span>
                          <span className="text-xs font-bold text-primary flex items-center justify-center gap-1">
                            <Target className="h-3 w-3" /> {member.accuracy_rate || 0}%
                          </span>
                        </div>
                      </div>

                      {/* Solved Challenges Chips by this Member */}
                      {member.solved_challenges && member.solved_challenges.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-border/30">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                            Solved Challenges ({member.solved_challenges.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {member.solved_challenges.map((c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="font-mono py-0.5 px-2 hover:bg-primary/10 transition-colors"
                              >
                                <span className="text-emerald-400 mr-1">✓</span>
                                {c.title}
                                <span className="ml-1 text-primary font-bold">+{c.points}</span>
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
            <CardHeader className="border-b border-border/40 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold font-outfit uppercase text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Challenge Category Distribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Points and solves breakdown across CTF challenge categories
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono">
                  {categoryBreakdown.length} Categories Mastered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {categoryBreakdown.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs font-mono">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No categories solved by this squad yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Bar Chart */}
                  <div className="h-56 w-full">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2">
                    {categoryBreakdown.map((cat, idx) => {
                      const color = CATEGORY_COLORS[cat.category] || '#00F0FF';
                      return (
                        <div key={idx} className="p-3 rounded-lg border border-border bg-muted/20 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="h-3 w-3 rounded-md shrink-0" style={{ backgroundColor: color }} />
                            <div>
                              <span className="font-bold text-xs text-foreground uppercase block font-outfit">
                                {cat.category.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {cat.count} Solved
                              </span>
                            </div>
                          </div>
                          <div className="text-right font-mono">
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
