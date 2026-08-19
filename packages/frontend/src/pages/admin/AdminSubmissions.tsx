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
  Percent,
  Trash2,
  Eye,
  AlertTriangle,
  Flame
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';
import { formatWIBTime, formatWIBDate, formatWIBDateTime } from '@/utils/date';

export const AdminSubmissions: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL');
  
  // Selected log for detail view modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Deletion state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk clear state
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Fetch up to 1000 latest logs for admin inspection
      const res = await api.get('/admin/logs?limit=1000');
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

  const handleDeleteSubmission = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/admin/submissions/${deleteTarget.id}`);
      toast.success(res.data.message || 'Submission deleted successfully!');
      setDeleteTarget(null);
      await fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete submission');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearFailedSubmissions = async () => {
    setIsClearing(true);
    try {
      const res = await api.post('/admin/submissions/clear', { type: 'WRONG' });
      toast.success(res.data.message || `Deleted ${res.data.count || 0} failed submissions.`);
      setClearModalOpen(false);
      await fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to clear submissions');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const headers = ['Status', 'Timestamp (WIB)', 'Team', 'User', 'Email', 'Challenge', 'Category', 'Points'];
    const rows = filteredLogs.map(l => [
      l.is_correct ? 'CORRECT' : 'FAILED',
      formatWIBDateTime(l.submitted_at),
      l.team?.name || 'Unknown',
      l.user?.username || 'Unknown',
      l.user?.email || 'Unknown',
      l.challenge?.title || 'Unknown',
      l.challenge?.category || '',
      l.is_correct ? (l.challenge?.points || 0) : 0
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
              Pengelolaan & Audit Submission
              <Badge variant="outline" className="font-mono">
                {totalSubmissions} Attempts
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola, audit, dan verifikasi seluruh pengiriman flag peserta arena kompetisi secara real-time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {wrongCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearModalOpen(true)}
              className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs gap-1.5 font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Bersihkan Failed Logs ({wrongCount})
            </Button>
          )}
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
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Correct Flags (Solves)</p>
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
              Correct Only ({correctCount})
            </button>
            <button
              onClick={() => { setStatusFilter('WRONG'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'WRONG' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Failed Only ({wrongCount})
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
                <TableHead className="text-xs uppercase">Timestamp (WIB)</TableHead>
                <TableHead className="text-xs uppercase">Squad / Team</TableHead>
                <TableHead className="text-xs uppercase">Operative</TableHead>
                <TableHead className="text-xs uppercase">Target Challenge</TableHead>
                <TableHead className="text-xs uppercase text-right">Points</TableHead>
                <TableHead className="text-xs uppercase text-center w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono">
                    Loading submission logs...
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No submission logs found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map((log) => (
                  <TableRow key={log.id} className={`border-border hover:bg-muted/30 ${log.is_first_blood ? 'bg-rose-500/10' : log.is_correct ? 'bg-emerald-500/5' : ''}`}>
                    <TableCell>
                      {log.is_first_blood ? (
                        <Badge className="bg-rose-600/20 text-rose-400 border border-rose-500/50 font-bold uppercase flex items-center gap-1 w-fit shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                          <Flame className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" />
                          🩸 FIRST BLOOD
                        </Badge>
                      ) : log.is_correct ? (
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-semibold uppercase flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" /> Correct {log.solve_rank && log.solve_rank > 1 ? `(#${log.solve_rank})` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 font-semibold uppercase flex items-center gap-1 w-fit">
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
                        <Badge variant="outline" className="uppercase font-mono px-1.5 py-0 mt-0.5 text-[10px]">
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

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title="Lihat Detail Submission"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(log)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                          title="Hapus / Invalidate Submission"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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

      {/* DETAIL MODAL */}
      {selectedLog && (
        <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => { if (!open) setSelectedLog(null); }}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${
                  selectedLog.is_correct 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  {selectedLog.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-outfit uppercase">
                    Detail Log Submission
                  </DialogTitle>
                  <DialogDescription className="text-xs font-mono">
                    ID: {selectedLog.id}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Status Hasil</span>
                  {selectedLog.is_first_blood ? (
                    <Badge className="mt-1 bg-rose-600/20 text-rose-400 border border-rose-500/50 font-bold uppercase flex items-center gap-1 w-fit">
                      <Flame className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" />
                      🩸 FIRST BLOOD (1st Solve)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className={`mt-1 font-bold ${
                      selectedLog.is_correct 
                        ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' 
                        : 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                    }`}>
                      {selectedLog.is_correct ? `CORRECT (Solve #${selectedLog.solve_rank || 1})` : 'FAILED ATTEMPT'}
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Poin Diperoleh</span>
                  <span className="text-sm font-mono font-bold text-primary mt-1 block">
                    {selectedLog.is_correct ? `+${selectedLog.challenge?.points || 0} PTS` : '0 PTS'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Tantangan Target</span>
                  <span className="font-bold text-foreground">{selectedLog.challenge?.title || 'Unknown'}</span>
                  <span className="text-muted-foreground font-mono text-[11px] block mt-0.5">
                    Kategori: {selectedLog.challenge?.category || 'N/A'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Squad / Tim</span>
                    <span className="font-semibold text-foreground">{selectedLog.team?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Operative</span>
                    <span className="font-semibold text-foreground">@{selectedLog.user?.username || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Waktu Pengiriman</span>
                  <span className="font-mono text-foreground">{formatWIBDateTime(selectedLog.submitted_at)}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Tutup
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const target = selectedLog;
                  setSelectedLog(null);
                  setDeleteTarget(target);
                }}
                className="gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus Submission Ini
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2.5 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <DialogTitle className="text-lg font-bold font-outfit uppercase">
                  Konfirmasi Hapus Submission
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Apakah Anda yakin ingin menghapus catatan submission ini?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2 text-xs">
              <div className="font-mono space-y-1">
                <div><strong>Squad:</strong> {deleteTarget.team?.name}</div>
                <div><strong>Operative:</strong> @{deleteTarget.user?.username}</div>
                <div><strong>Tantangan:</strong> {deleteTarget.challenge?.title}</div>
                <div><strong>Status:</strong> {deleteTarget.is_correct ? 'CORRECT (Solve)' : 'FAILED'}</div>
              </div>
              {deleteTarget.is_correct && (
                <p className="text-rose-400 font-semibold text-[11px] pt-1.5 border-t border-destructive/20">
                  ⚠️ Menghapus submission solve akan membatalkan status solve tantangan ini bagi tim, menghitung ulang skor total tim, dan mereset First Blood jika berlaku.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSubmission}
                disabled={isDeleting}
                className="font-bold"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Submission'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK CLEAR FAILED SUBMISSIONS MODAL */}
      <Dialog open={clearModalOpen} onOpenChange={setClearModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-destructive">
              <Trash2 className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold font-outfit uppercase">
                Bersihkan Log Gagal (Failed Attempts)
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Tindakan ini akan menghapus seluruh catatan pengiriman flag yang gagal/salah untuk merapikan riwayat audit arena.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <p className="font-semibold text-amber-400">Rincian Tindakan:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
              <li>Hanya menghapus submission dengan status <strong>FAILED</strong>.</li>
              <li>Poin tim dan submission <strong>CORRECT (Solves)</strong> tidak akan terpengaruh.</li>
              <li>Total log gagal yang akan dihapus: <strong>{wrongCount} attempts</strong>.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearModalOpen(false)}
              disabled={isClearing}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearFailedSubmissions}
              disabled={isClearing}
              className="font-bold"
            >
              {isClearing ? 'Membersihkan...' : 'Bersihkan Log Gagal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
