import React from 'react';
import { Users, Shield, Trophy, CheckCircle2, Percent, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface AdminStatsProps {
  data: {
    stats: {
      total_participants: number;
      total_teams: number;
      total_challenges: number;
      total_submissions: number;
      correct_submissions: number;
      overall_accuracy: string;
    };
    solve_rates: Array<{
      id: string;
      title: string;
      category: string;
      points: number;
      total_attempts: number;
      successful_solves: number;
      solve_rate: string;
    }>;
  } | null;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ data }) => {
  if (!data) return <div className="text-center p-8 text-muted-foreground font-mono">Loading Stats...</div>;

  const { stats, solve_rates } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-primary/40 bg-black/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase font-outfit">Total Participants</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-white">{stats.total_participants}</div>
            <p className="text-xs text-muted-foreground mt-1">across {stats.total_teams} active teams</p>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-black/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase font-outfit">Active Challenges</CardTitle>
            <Shield className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-white">{stats.total_challenges}</div>
            <p className="text-xs text-muted-foreground mt-1">in 6 categories</p>
          </CardContent>
        </Card>

        <Card className="border-primary/40 bg-black/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase font-outfit">Overall Accuracy</CardTitle>
            <Target className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black font-mono text-primary">{stats.overall_accuracy}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.correct_submissions} correct of {stats.total_submissions} attempts</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-xl font-bold font-outfit text-white">Challenge Solve Rate Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Points</TableHead>
                <TableHead className="text-right">Total Attempts</TableHead>
                <TableHead className="text-right">Successful Solves</TableHead>
                <TableHead className="text-right">Solve Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solve_rates.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold text-white">{c.title}</TableCell>
                  <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-primary font-bold">{c.points}</TableCell>
                  <TableCell className="text-right font-mono">{c.total_attempts}</TableCell>
                  <TableCell className="text-right font-mono text-primary font-bold">{c.successful_solves}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{c.solve_rate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
