import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  RefreshCw, 
  Award, 
  CheckCircle2, 
  Clock, 
  Edit3, 
  Eye, 
  MessageSquare,
  FileDown,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminWriteups: React.FC = () => {
  const [writeups, setWriteups] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Evaluation Dialog Modal state
  const [evaluatingItem, setEvaluatingItem] = useState<any | null>(null);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const fetchWriteups = async () => {
    setLoading(true);
    try {
      const url = selectedEventId === 'ALL' 
        ? '/writeup/admin/all' 
        : `/writeup/admin/all?event_id=${selectedEventId}`;
      const res = await api.get(url);
      setWriteups(res.data || []);
    } catch (err) {
      toast.error('Gagal memuat daftar dokumen writeup.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchWriteups();
  }, [selectedEventId]);

  const handleOpenEvaluate = (w: any) => {
    setEvaluatingItem(w);
    setEvalScore(w.score || 0);
    setEvalFeedback(w.feedback || '');
  };

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evaluatingItem) return;

    setSaveLoading(true);
    try {
      const res = await api.post(`/writeup/admin/evaluate/${evaluatingItem.id}`, {
        score: evalScore,
        feedback: evalFeedback
      });

      toast.success(res.data.message || 'Penilaian berhasil disimpan!');
      setEvaluatingItem(null);
      fetchWriteups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan penilaian.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownloadFile = async (writeup: any) => {
    try {
      const res = await api.get(`/writeup/download/${writeup.id}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', writeup.file_name || 'writeup.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Mengunduh ${writeup.file_name}...`);
    } catch (err) {
      toast.error('Gagal mengunduh file writeup.');
    }
  };

  const handleExportCSV = () => {
    if (filteredWriteups.length === 0) {
      toast.error('Tidak ada data writeup untuk diekspor');
      return;
    }

    const headers = ['Squad (Team)', 'Event Arena', 'Submitter', 'File Name', 'Size (KB)', 'Uploaded At', 'Score', 'Evaluated By', 'Feedback'];
    const rows = filteredWriteups.map(w => [
      w.team?.name || 'N/A',
      w.event?.name || 'N/A',
      w.user?.username || 'N/A',
      w.file_name,
      Math.round(w.file_size / 1024),
      new Date(w.submitted_at).toISOString(),
      w.score || 0,
      w.evaluated_by || 'Pending',
      (w.feedback || '').replace(/"/g, '""')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => `"${e.join('","')}"`)].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `writeup_evaluation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Laporan penilaian writeup diekspor ke CSV.');
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter computation
  const filteredWriteups = writeups.filter(w => {
    const q = search.toLowerCase();
    const teamName = w.team?.name?.toLowerCase() || '';
    const username = w.user?.username?.toLowerCase() || '';
    const fileName = w.file_name?.toLowerCase() || '';
    const eventName = w.event?.name?.toLowerCase() || '';

    return teamName.includes(q) || username.includes(q) || fileName.includes(q) || eventName.includes(q);
  });

  const totalPages = Math.ceil(filteredWriteups.length / pageSize) || 1;
  const paginatedWriteups = filteredWriteups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalSubmissions = writeups.length;
  const evaluatedCount = writeups.filter(w => w.evaluated_at).length;
  const pendingCount = totalSubmissions - evaluatedCount;
  const avgScore = evaluatedCount > 0 
    ? Math.round(writeups.reduce((acc, w) => acc + (w.score || 0), 0) / evaluatedCount) 
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Writeup & Incident Report Evaluation
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {totalSubmissions} Submitted
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Evaluasi laporan investigasi insiden dari masing-masing tim, berikan nilai skor, dan feedback dewan juri untuk menentukan pemenang akhir.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-xs border-border h-9"
          >
            <FileDown className="h-3.5 w-3.5" /> Export Evaluasi (CSV)
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWriteups}
            disabled={loading}
            className="h-9 w-9 border-border"
            title="Reload Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Laporan Masuk</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalSubmissions}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Menunggu Penilaian</p>
              <h3 className="text-3xl font-black font-mono text-amber-400 mt-1">{pendingCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Sudah Dinilai Juri</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{evaluatedCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-primary/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">Rata-Rata Nilai</p>
              <h3 className="text-3xl font-black font-mono text-primary mt-1">{avgScore} PTS</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Event Arena Tabs */}
            <div className="overflow-x-auto w-full md:w-auto pb-1">
              <Tabs value={selectedEventId} onValueChange={(val) => { setSelectedEventId(val); setCurrentPage(1); }}>
                <TabsList>
                  <TabsTrigger value="ALL" className="text-xs">Semua Arena</TabsTrigger>
                  {events.map((ev) => (
                    <TabsTrigger key={ev.id} value={ev.id} className="text-xs font-medium">
                      {ev.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari tim, user, file..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-background h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Writeup Submissions Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border">
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Squad (Team)</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Arena Event</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Dokumen File</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Waktu Kirim</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Skor Juri</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Status & Reviewer</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Aksi Juri</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={7} className="h-14 text-center">
                      <div className="h-4 bg-muted/40 rounded animate-pulse w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedWriteups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-semibold">Belum ada dokumen writeup yang dikirimkan pada arena ini.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWriteups.map((w) => (
                  <TableRow key={w.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: w.team?.color || '#00F0FF' }} />
                          {w.team?.name || 'Tanpa Tim'}
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          Oleh @{w.user?.username} ({w.team?.members?.length || 1} anggota)
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {w.event?.name || 'Default Arena'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownloadFile(w)}
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary font-mono hover:bg-primary/10"
                          title="Klik untuk mendownload file laporan"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="max-w-[140px] truncate">{w.file_name}</span>
                          <span className="text-[10px] text-muted-foreground">({formatBytes(w.file_size)})</span>
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(w.submitted_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </TableCell>

                    <TableCell>
                      <span className={`font-mono font-bold text-sm ${w.score > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                        +{w.score || 0} PTS
                      </span>
                    </TableCell>

                    <TableCell>
                      {w.evaluated_at ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                            ✓ Evaluated
                          </Badge>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            @{w.evaluated_by}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                          Pending Review
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenEvaluate(w)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {w.evaluated_at ? 'Edit Nilai' : 'Beri Nilai'}
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
          totalItems={filteredWriteups.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Evaluate Writeup Dialog Modal */}
      <Dialog open={!!evaluatingItem} onOpenChange={(open) => !open && setEvaluatingItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit text-xl">
              <Award className="h-5 w-5 text-primary" />
              Penilaian Dokumen Writeup
            </DialogTitle>
            <DialogDescription className="text-xs">
              Masukkan skor penilaian laporan investigasi tim <strong>{evaluatingItem?.team?.name}</strong>. Skor akan langsung ditambahkan ke total poin tim pada scoreboard secara realtime.
            </DialogDescription>
          </DialogHeader>

          {evaluatingItem && (
            <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-2">
              {/* Team & File Info */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tim Peserta:</span>
                  <span className="font-bold text-foreground">{evaluatingItem.team?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Arena Event:</span>
                  <span className="font-mono text-foreground">{evaluatingItem.event?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">File Dokumen:</span>
                  <button 
                    type="button" 
                    onClick={() => handleDownloadFile(evaluatingItem)}
                    className="text-primary hover:underline font-mono font-bold flex items-center gap-1"
                  >
                    <Download className="h-3 w-3" /> {evaluatingItem.file_name} ({formatBytes(evaluatingItem.file_size)})
                  </button>
                </div>
                {evaluatingItem.notes && (
                  <div className="pt-2 border-t border-border/60">
                    <span className="text-muted-foreground block mb-0.5 font-semibold">Catatan dari Tim:</span>
                    <p className="italic text-foreground">{evaluatingItem.notes}</p>
                  </div>
                )}
              </div>

              {/* Score Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                  <span>Poin Penilaian Juri (Score)</span>
                  <span className="text-[10px] text-emerald-400 font-mono">+PTS ke Scoreboard</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={5000}
                  step={10}
                  value={evalScore}
                  onChange={(e) => setEvalScore(Number(e.target.value))}
                  className="font-mono text-lg font-bold text-emerald-400 h-10"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Poin ini akan diakumulasikan ke skor akhir tim untuk menentukan peringkat pemenang.
                </p>
              </div>

              {/* Feedback Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Feedback & Catatan Dewan Juri (Opsional)
                </label>
                <Textarea
                  placeholder="Tuliskan evaluasi kualitas metodologi, ketepatan analisis PoC, dan rekomendasi perbaikan untuk tim..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className="text-xs resize-none h-24"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEvaluatingItem(null)}>Batal</Button>
                <Button type="submit" disabled={saveLoading} className="gap-1.5">
                  {saveLoading ? 'Menyimpan...' : 'Simpan & Publikasikan Nilai'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
