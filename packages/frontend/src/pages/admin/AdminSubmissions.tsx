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
  Flame,
  Edit3,
  Calendar,
  RotateCcw
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
import { formatWIBTime, formatWIBDate, formatWIBDateTime, toWIBInputString, fromWIBInputString } from '@/utils/date';

export const AdminSubmissions: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CORRECT' | 'WRONG'>('ALL');
  
  // Selected log for detail view modal
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Edit submission state
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editSubmittedAt, setEditSubmittedAt] = useState('');
  const [editIsCorrect, setEditIsCorrect] = useState(false);
  const [editFlag, setEditFlag] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleOpenEdit = (log: any) => {
    setEditTarget(log);
    setEditSubmittedAt(toWIBInputString(log.submitted_at, true));
    setEditIsCorrect(Boolean(log.is_correct));
    setEditFlag(log.flag || '');
  };

  const handleSaveEditSubmission = async () => {
    if (!editTarget) return;
    if (!editSubmittedAt) {
      toast.error('Waktu submission tidak boleh kosong');
      return;
    }

    const isoDate = fromWIBInputString(editSubmittedAt);
    if (!isoDate) {
      toast.error('Format tanggal/waktu WIB tidak valid');
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await api.put(`/admin/submissions/${editTarget.id}`, {
        submitted_at: isoDate,
        is_correct: editIsCorrect,
        flag: editFlag.trim() || undefined
      });
      toast.success(res.data.message || 'Waktu submission berhasil diperbarui!');
      setEditTarget(null);
      if (selectedLog && selectedLog.id === editTarget.id) {
        setSelectedLog(null);
      }
      await fetchLogs();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui waktu submission');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const adjustEditMinutes = (minutesOffset: number) => {
    const currentIso = fromWIBInputString(editSubmittedAt) || new Date().toISOString();
    const newDate = new Date(new Date(currentIso).getTime() + minutesOffset * 60 * 1000);
    setEditSubmittedAt(toWIBInputString(newDate, true));
  };

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
                          FIRST BLOOD
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
                        <div className="flex flex-col items-end">
                          <span className="text-primary font-bold">
                            +{(log as any).points_awarded ?? log.challenge?.points ?? 0}
                          </span>
                          {(log as any).bonus_points > 0 && (
                            <span className="text-[10px] text-amber-400 font-mono font-normal">
                              (+{(log as any).bonus_points} {log.is_first_blood ? 'FB' : 'Bonus'})
                            </span>
                          )}
                        </div>
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
                          title="View Submission Details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(log)}
                          className="h-7 w-7 text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
                          title="Edit Waktu / Status Submission"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(log)}
                          className="h-7 w-7 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10"
                          title="Delete / Invalidate Submission"
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
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge variant={selectedLog.is_correct ? 'default' : 'destructive'} className="font-mono text-xs">
                  {selectedLog.is_correct ? 'CORRECT (SOLVE)' : 'FAILED ATTEMPT'}
                </Badge>
                {selectedLog.is_correct && (selectedLog as any).is_first_blood && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs gap-1 font-mono">
                    <Flame className="h-3 w-3" /> First Blood
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-bold font-outfit uppercase tracking-wide text-foreground mt-2">
                Submission Audit Detail
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Log ID: #{selectedLog.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submitted Flag</span>
                <code className="text-primary font-mono font-bold break-all block bg-black/40 p-2.5 rounded border border-border/60 text-xs">
                  {selectedLog.flag || (
                    <span className="text-muted-foreground italic font-normal font-sans">(Not captured for previous legacy logs)</span>
                  )}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">IP Address</span>
                  <span className="font-mono font-bold text-foreground text-sm">
                    {selectedLog.ip || <span className="text-muted-foreground italic text-xs font-normal font-sans">Not Captured</span>}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Earned Points</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {selectedLog.is_correct ? `+${(selectedLog as any).awarded_points ?? selectedLog.challenge?.points ?? 0} PTS` : '0 PTS'}
                  </span>
                  {selectedLog.is_correct && (selectedLog as any).bonus_points > 0 && (
                    <span className="text-[10px] font-mono text-amber-400 block mt-0.5">
                      Base: +{(selectedLog as any).base_points ?? selectedLog.challenge?.points ?? 0} | Bonus: +{(selectedLog as any).bonus_points} PTS
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Target Challenge</span>
                  <span className="font-bold text-foreground">{selectedLog.challenge?.title || 'Unknown'}</span>
                  <span className="text-muted-foreground font-mono text-[11px] block mt-0.5">
                    Category: {selectedLog.challenge?.category || 'N/A'}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Squad / Team</span>
                    <span className="font-semibold text-foreground">{selectedLog.team?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Operative</span>
                    <span className="font-semibold text-foreground">@{selectedLog.user?.username || 'N/A'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Submission Timestamp</span>
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
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const target = selectedLog;
                  setSelectedLog(null);
                  handleOpenEdit(target);
                }}
                className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Waktu
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
                Delete This Submission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* EDIT SUBMISSION MODAL */}
      {editTarget && (
        <Dialog open={Boolean(editTarget)} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
          <DialogContent className="sm:max-w-lg bg-card border-border">
            <DialogHeader>
              <div className="flex items-center gap-2 text-amber-400">
                <Edit3 className="h-5 w-5" />
                <DialogTitle className="text-xl font-bold font-outfit uppercase">
                  Edit Waktu & Detail Submission
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Log ID: #{editTarget.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              {/* Context Summary */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Squad / Tim</span>
                  <span className="font-bold text-foreground">{editTarget.team?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Operative</span>
                  <span className="font-semibold text-foreground">@{editTarget.user?.username || 'N/A'}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-border/40">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Target Challenge</span>
                  <span className="font-semibold text-foreground">{editTarget.challenge?.title || 'Unknown'}</span>
                </div>
              </div>

              {/* Timestamp Input */}
              <div className="space-y-2 p-3 rounded-lg bg-background border border-border">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Waktu Submission (WIB - UTC+7)
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Format: YYYY-MM-DD HH:mm:ss
                  </span>
                </div>

                <Input
                  type="datetime-local"
                  step="1"
                  value={editSubmittedAt}
                  onChange={(e) => setEditSubmittedAt(e.target.value)}
                  className="font-mono text-xs bg-muted/20 h-9"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Shortcut:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSubmittedAt(toWIBInputString(new Date(), true))}
                    className="h-6 text-[10px] px-2 gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Clock className="h-3 w-3" /> Sekarang (Now)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustEditMinutes(-5)}
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    -5m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustEditMinutes(-1)}
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    -1m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustEditMinutes(1)}
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    +1m
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => adjustEditMinutes(5)}
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-foreground"
                  >
                    +5m
                  </Button>
                </div>

                {/* Live WIB Preview */}
                {editSubmittedAt && (
                  <div className="p-2 rounded bg-muted/30 border border-border/40 font-mono text-[11px] text-primary flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>Terbaca: <strong>{formatWIBDateTime(fromWIBInputString(editSubmittedAt))}</strong></span>
                  </div>
                )}
              </div>

              {/* Status Toggle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Status Submission
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditIsCorrect(true)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      editIsCorrect
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    CORRECT (Solve)
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditIsCorrect(false)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                      !editIsCorrect
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                        : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    FAILED ATTEMPT
                  </button>
                </div>
              </div>

              {/* Submitted Flag string */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Submitted Flag (Audit Record)
                </label>
                <Input
                  value={editFlag}
                  onChange={(e) => setEditFlag(e.target.value)}
                  placeholder="e.g. RISERANGER{flag_here}"
                  className="font-mono text-xs h-9 bg-muted/20"
                />
              </div>

              {/* Info Notice */}
              <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-cyan-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Kalkulasi Otomatis Scoreboard & Freeze
                </p>
                <p className="text-cyan-200/80 leading-relaxed">
                  Menyesuaikan waktu submission akan secara otomatis merekalibrasi urutan <strong>First Blood</strong>, <strong>Solve Decay Rank</strong>, dan sinkronisasi <strong>Scoreboard publik (Freeze) maupun Live Admin</strong>.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditTarget(null)}
                disabled={isSavingEdit}
              >
                Batal
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditSubmission}
                disabled={isSavingEdit}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold gap-1.5"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Edit3 className="h-3.5 w-3.5" />
                    Simpan Perubahan
                  </>
                )}
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
                  Confirm Delete Submission
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground pt-1">
                Are you sure you want to delete this submission entry?
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/30 space-y-2 text-xs">
              <div className="font-mono space-y-1">
                <div><strong>Squad:</strong> {deleteTarget.team?.name}</div>
                <div><strong>Operative:</strong> @{deleteTarget.user?.username}</div>
                <div><strong>Challenge:</strong> {deleteTarget.challenge?.title}</div>
                <div><strong>Status:</strong> {deleteTarget.is_correct ? 'CORRECT (Solve)' : 'FAILED'}</div>
              </div>
              {deleteTarget.is_correct && (
                <p className="text-rose-400 font-semibold text-[11px] pt-1.5 border-t border-destructive/20">
                  ⚠️ Deleting a solve submission will invalidate the challenge solve status for this squad, recalculate their total score, and reset First Blood if applicable.
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
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteSubmission}
                disabled={isDeleting}
                className="font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Submission'}
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
                Clear Failed Attempts Logs
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              This will remove all incorrect/failed flag submission logs to clean up the arena audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <p className="font-semibold text-amber-400">Action Summary:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-300 font-mono text-[11px]">
              <li>Only removes submissions with status <strong>FAILED</strong>.</li>
              <li>Squad scores and <strong>CORRECT (Solves)</strong> submissions remain unaffected.</li>
              <li>Total failed attempt logs to be removed: <strong>{wrongCount} attempts</strong>.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearModalOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearFailedSubmissions}
              disabled={isClearing}
              className="font-bold"
            >
              {isClearing ? 'Clearing...' : 'Clear Failed Logs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
