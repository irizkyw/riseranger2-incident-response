import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Download, 
  RefreshCw, 
  Activity, 
  Trophy, 
  Percent 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/services/api';
import { formatWIBTime, formatWIBDate, formatWIBDateTime } from '@/utils/date';

export const AdminSubmissions: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch up to 500 latest logs for admin inspection
      const res = await api.get('/admin/logs?limit=500');
      setLogs(res.data || []);
    } catch (err) {
      toast.error('Failed to load submission audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Status', 'Timestamp', 'Team', 'User', 'Email', 'Challenge', 'Category', 'Points'];
    const rows = filteredLogs.map(l => [
      l.is_correct ? 'CORRECT' : 'FAILED',
      formatWIBDateTime(l.submitted_at),
      l.team?.name || 'Unknown',
      l.user?.username || 'Unknown',
      l.user?.email || 'Unknown',
      l.challenge?.title || 'Unknown',
      l.challenge?.category || '',
      l.is_correct ? l.challenge?.points : 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_submissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Submission logs exported to CSV!');
  };

  // Filter computation
  const filteredLogs = logs.filter(l => {
    const q = search.toLowerCase();
    const matchesSearch = 
      (l.team?.name && l.team.name.toLowerCase().includes(q)) ||
      (l.user?.username && l.user.username.toLowerCase().includes(q)) ||
      (l.user?.email && l.user.email.toLowerCase().includes(q)) ||
      (l.challenge?.title && l.challenge.title.toLowerCase().includes(q)) ||
      (l.challenge?.category && l.challenge.category.toLowerCase().includes(q));

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'CORRECT' && l.is_correct) || 
      (statusFilter === 'WRONG' && !l.is_correct);

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalSubmissions = logs.length;
  const correctCount = logs.filter(l => l.is_correct).length;
  const wrongCount = logs.filter(l => !l.is_correct).length;
  const accuracy = totalSubmissions > 0 ? ((correctCount / totalSubmissions) * 100).toFixed(1) : '0';

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Submission Audit Logs
              <Badge variant="outline" className="font-mono">
                {totalSubmissions} Attempts
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time security and flag submission audit trail across all challenges and teams.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Submissions</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalSubmissions}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Correct Flags Hit</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{correctCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-rose-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-400 tracking-wider">Failed Attempts</p>
              <h3 className="text-3xl font-black font-mono text-rose-400 mt-1">{wrongCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-cyan-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">Overall Accuracy</p>
              <h3 className="text-3xl font-black font-mono text-cyan-400 mt-1">{accuracy}%</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Percent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-md border border-input bg-background p-0.5 text-xs">
            <button
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All Submissions
            </button>
            <button
              onClick={() => { setStatusFilter('CORRECT'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'CORRECT' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Correct Only
            </button>
            <button
              onClick={() => { setStatusFilter('WRONG'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'WRONG' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Failed Only
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search team, user, challenge..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchLogs} className="h-9 w-9" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase">Result Status</TableHead>
                <TableHead className="text-xs uppercase">Timestamp</TableHead>
                <TableHead className="text-xs uppercase">Squad / Team</TableHead>
                <TableHead className="text-xs uppercase">Operative</TableHead>
                <TableHead className="text-xs uppercase">Target Challenge</TableHead>
                <TableHead className="text-xs uppercase text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono">
                    Loading submission logs...
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No submission logs found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className={`border-border hover:bg-muted/30 ${log.is_correct ? 'bg-emerald-500/5' : ''}`}>
                    <TableCell>
                      {log.is_correct ? (
                        <Badge variant="outline" className="font-semibold uppercase flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Correct
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-semibold uppercase flex items-center gap-1 w-fit">
                          <XCircle className="h-3 w-3" /> Failed
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="font-semibold text-foreground/90">{formatWIBTime(log.submitted_at)}</span>
                        <span className="text-[10px] text-muted-foreground/50">({formatWIBDate(log.submitted_at)})</span>
                      </div>
                    </TableCell>

                    <TableCell className="font-bold text-foreground text-sm">
                      {log.team?.name || 'Unknown Team'}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-foreground">@{log.user?.username || 'Unknown'}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{log.user?.email || 'N/A'}</div>
                    </TableCell>

                    <TableCell>
                      <div className="font-semibold text-foreground text-xs">{log.challenge?.title || 'Unknown'}</div>
                      {log.challenge?.category && (
                        <Badge variant="outline" className="uppercase font-mono px-1.5 py-0 mt-0.5">
                          {log.challenge.category}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-mono font-bold text-sm">
                      {log.is_correct ? (
                        <span className="text-primary font-bold">+{log.challenge?.points || 0}</span>
                      ) : (
                        <span className="text-muted-foreground/40 font-normal">0</span>
                      )}
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
          totalItems={filteredLogs.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>
    </div>
  );
};
