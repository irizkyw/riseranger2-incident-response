import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Shield, 
  Trophy, 
  CheckCircle2, 
  Percent, 
  Target, 
  Search, 
  Download, 
  RefreshCw, 
  Activity, 
  Layers,
  Radio,
  Timer,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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
  onRefresh?: () => void;
  loading?: boolean;
}

export const AdminStats: React.FC<AdminStatsProps> = ({ data, onRefresh, loading = false }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  if (!data) return <div className="text-center p-8 text-muted-foreground font-mono">Loading Stats...</div>;

  const { stats, solve_rates } = data;

  // Categories list
  const categories = Array.from(new Set(solve_rates.map(s => s.category)));

  const handleExportCSV = () => {
    if (filteredSolveRates.length === 0) {
      toast.error('No statistics to export');
      return;
    }

    const headers = ['Challenge Title', 'Category', 'Points', 'Total Attempts', 'Successful Solves', 'Solve Rate %'];
    const rows = filteredSolveRates.map(c => [
      c.title,
      c.category,
      c.points,
      c.total_attempts,
      c.successful_solves,
      c.solve_rate
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_solve_rates_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Solve rates exported to CSV!');
  };

  const filteredSolveRates = solve_rates.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
    const matchesCat = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const totalPages = Math.ceil(filteredSolveRates.length / pageSize) || 1;
  const paginatedSolveRates = filteredSolveRates.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Live Activity Radar Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/50 via-card to-card border border-cyan-500/40 shadow-[0_0_30px_rgba(0,240,255,0.1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/40 shrink-0 shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-outfit">Live Challenge Activity Tracker</h3>
              <Badge variant="outline" className="font-mono font-bold">
                REAL-TIME RADAR
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pantau langsung tantangan yang sedang dikerjakan peserta beserta live stopwatch timer pengerjaannya.
            </p>
          </div>
        </div>

        <Link to="/hq/live-activity">
          <Button size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.3)] shrink-0">
            <span>Buka Live Tracker</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Participants</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{stats.total_participants}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">in {stats.total_teams} CTF squads</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-primary/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">Active Challenges</p>
              <h3 className="text-3xl font-black font-mono text-primary mt-1">{stats.total_challenges}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">across active categories</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-purple-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-purple-400 tracking-wider">Total Submissions</p>
              <h3 className="text-3xl font-black font-mono text-purple-400 mt-1">{stats.total_submissions}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">{stats.correct_submissions} flags captured</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-cyan-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">Overall Accuracy</p>
              <h3 className="text-3xl font-black font-mono text-cyan-400 mt-1">{stats.overall_accuracy}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">success conversion rate</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Target className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solve Rates Table Section */}
      <div className="space-y-4">
        {/* Filter and Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <select 
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search challenge..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 h-9 text-xs"
              />
            </div>

            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </Button>

            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9" title="Refresh Statistics">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs uppercase">Challenge Name</TableHead>
                  <TableHead className="text-xs uppercase">Category</TableHead>
                  <TableHead className="text-xs uppercase text-right">Points</TableHead>
                  <TableHead className="text-xs uppercase text-right">Total Attempts</TableHead>
                  <TableHead className="text-xs uppercase text-right">Successful Solves</TableHead>
                  <TableHead className="text-xs uppercase text-right">Solve Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSolveRates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm">No challenge statistics found matching your filter.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSolveRates.map((c) => (
                    <TableRow key={c.id} className="border-border hover:bg-muted/30">
                      <TableCell className="font-bold text-foreground text-sm">{c.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono uppercase">{c.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary font-bold text-sm">
                        {c.points} PTS
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {c.total_attempts}
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-400 font-bold text-sm">
                        {c.successful_solves}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-sm text-foreground">
                        {c.solve_rate}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredSolveRates.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </Card>
      </div>
    </div>
  );
};
