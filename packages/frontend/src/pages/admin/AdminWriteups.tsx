import React, { useEffect, useState, useRef } from 'react';
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
  Layers,
  Upload,
  Plus,
  FileCheck,
  FileArchive,
  Trash2,
  AlertCircle
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { WriteupViewerModal } from '@/components/WriteupViewerModal';
import { toast } from 'sonner';
import api from '@/services/api';
import { formatWIBDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';

export const AdminWriteups: React.FC = () => {
  const [writeups, setWriteups] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Upload Writeup Modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedUploadTeamId, setSelectedUploadTeamId] = useState<string>('');
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Writeup Viewer state
  const [viewingWriteup, setViewingWriteup] = useState<any | null>(null);

  // Evaluation Dialog Modal state
  const [evaluatingItem, setEvaluatingItem] = useState<any | null>(null);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [evalFeedback, setEvalFeedback] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const fetchTeamsForUpload = async () => {
    setTeamsLoading(true);
    try {
      const res = await api.get('/admin/teams');
      const teams = res.data || [];
      setAllTeams(teams);
      if (teams.length > 0 && !selectedUploadTeamId) {
        setSelectedUploadTeamId(teams[0].id);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setTeamsLoading(false);
    }
  };

  const handleOpenUploadModal = () => {
    setUploadModalOpen(true);
    setSelectedUploadFile(null);
    setUploadNotes('');
    fetchTeamsForUpload();
  };

  const validateAndSetUploadFile = (file: File) => {
    const allowed = ['.pdf', '.zip', '.rar', '.7z', '.tar', '.gz', '.docx', '.doc', '.md', '.txt'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowed.includes(ext)) {
      toast.error('Unsupported file format! Please use .pdf, .zip, .rar, .docx, or .md');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size too large! Maximum allowed is 50MB.');
      return;
    }

    setSelectedUploadFile(file);
    toast.success(`File "${file.name}" ready to upload.`);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUploadTeamId) {
      toast.error('Please select a target squad first.');
      return;
    }
    if (!selectedUploadFile) {
      toast.error('Please select a writeup document file (.pdf, .docx, .zip, .md) first.');
      return;
    }

    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedUploadFile);
      formData.append('team_id', selectedUploadTeamId);
      if (uploadNotes) {
        formData.append('notes', uploadNotes);
      }

      const res = await api.post('/writeup/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success(res.data.message || 'Writeup document uploaded successfully!');
      setUploadModalOpen(false);
      setSelectedUploadFile(null);
      setUploadNotes('');
      fetchWriteups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to upload writeup document.');
    } finally {
      setUploadLoading(false);
    }
  };

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
      toast.error('Failed to load writeup submissions list.');
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

      toast.success(res.data.message || 'Evaluation saved successfully!');
      setEvaluatingItem(null);
      fetchWriteups();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save evaluation.');
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
      toast.success(`Downloading ${writeup.file_name}...`);
    } catch (err) {
      toast.error('Failed to download writeup file.');
    }
  };

  const handleExportCSV = () => {
    if (filteredWriteups.length === 0) {
      toast.error('No writeup data available to export');
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
    toast.success('Evaluation report exported to CSV.');
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Writeup Report Evaluation
              <Badge variant="outline" className="font-mono">
                {totalSubmissions} Submissions
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Evaluate incident investigation reports submitted by squads, assign jury score points, and provide reviewer feedback.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-nowrap shrink-0">
          <Button
            onClick={handleOpenUploadModal}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs sm:text-sm whitespace-nowrap shadow-sm"
          >
            <Upload className="h-4 w-4" /> Upload Squad Writeup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2 text-xs border-border h-9 whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchWriteups}
            disabled={loading}
            className="h-9 w-9 border-border shrink-0"
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
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Submissions</p>
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
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Pending Evaluation</p>
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
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Evaluated by Jury</p>
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
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">Average Score</p>
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
                  <TabsTrigger value="ALL" className="text-xs font-medium">All Arenas</TabsTrigger>
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
                placeholder="Search squad, user, filename..."
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
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Writeup Document</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Submitted At</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Jury Score</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Status & Reviewer</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Actions</TableHead>
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
                    <p className="text-sm font-semibold">No writeup documents submitted in this arena yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedWriteups.map((w) => (
                  <TableRow key={w.id} className="border-border hover:bg-muted/20">
                    <TableCell>
                      <div>
                        <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: w.team?.color || '#00F0FF' }} />
                          {w.team?.name || 'No Squad'}
                          <Badge variant="outline" className="font-mono ml-1">
                            {w.team?.score || 0} PTS
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground block">
                          By <span className="font-semibold text-foreground">@{w.user?.username}</span> ({w.user?._count?.submissions || 0} user solves) • Team: {w.team?._count?.submissions || 0} solves
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {w.event?.name || 'Default Arena'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingWriteup(w)}
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary font-mono hover:bg-primary/10"
                          title="Open Document Viewer"
                        >
                          <Eye className="h-3.5 w-3.5 text-cyan-400" />
                          <span className="max-w-[140px] truncate">{w.file_name}</span>
                          <span className="text-[10px] text-muted-foreground">({formatBytes(w.file_size)})</span>
                        </Button>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatWIBDateTime(w.submitted_at)}
                    </TableCell>

                    <TableCell>
                      <div>
                        <span className={`font-mono font-bold text-sm ${w.score > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          +{w.score || 0} PTS
                        </span>
                        <span className="text-[10px] text-muted-foreground block font-mono">
                          Total: {w.team?.score || 0} pts
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {w.evaluated_at ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-300">
                            ✓ Evaluated
                          </Badge>
                          <span className="text-[10px] text-muted-foreground block font-mono">
                            @{w.evaluated_by}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-300">
                          Pending Review
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingWriteup(w)}
                          className="h-7 w-7 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          title="View Writeup Document"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">Viewer</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEvaluate(w)}
                          className="h-7 w-7 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                          title={w.evaluated_at ? 'Edit Jury Score' : 'Assign Jury Score'}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span className="sr-only">{w.evaluated_at ? 'Edit Score' : 'Score Writeup'}</span>
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
        <DialogContent className="sm:max-w-lg bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit text-xl font-bold">
              <Award className="h-5 w-5 text-primary" />
              Writeup Document Evaluation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the evaluation score for squad <strong>{evaluatingItem?.team?.name}</strong>. Points will be automatically added to the squad's total score on the scoreboard.
            </DialogDescription>
          </DialogHeader>

          {evaluatingItem && (
            <form onSubmit={handleSaveEvaluation} className="space-y-4 pt-2">
              {/* Team & User Points Stats Info */}
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Squad / Team:</span>
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: evaluatingItem.team?.color || '#00F0FF' }} />
                    {evaluatingItem.team?.name}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitter (User):</span>
                  <span className="font-semibold text-foreground">
                    @{evaluatingItem.user?.username} ({evaluatingItem.user?._count?.submissions || 0} solves)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Squad CTF Flag Points:</span>
                  <span className="font-mono text-foreground font-bold">
                    {(evaluatingItem.team?.score || 0) - (evaluatingItem.team?.writeup_score || 0)} PTS
                    <span className="text-muted-foreground font-normal ml-1">
                      ({evaluatingItem.team?._count?.submissions || 0} solved)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Scoreboard Score:</span>
                  <Badge variant="outline" className="font-mono font-bold">
                    {evaluatingItem.team?.score || 0} PTS
                  </Badge>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-1.5">
                  <span className="text-muted-foreground">Arena Event:</span>
                  <span className="font-mono text-foreground">{evaluatingItem.event?.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Document File:</span>
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
                    <span className="text-muted-foreground block mb-0.5 font-semibold">Squad Notes:</span>
                    <p className="italic text-foreground">{evaluatingItem.notes}</p>
                  </div>
                )}
              </div>

              {/* Score Input & Live Simulation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">
                    Jury Evaluation Score (PTS) *
                  </label>
                  <span className="text-[10px] text-primary font-mono font-bold">
                    Simulated New Total: {((evaluatingItem.team?.score || 0) - (evaluatingItem.score || 0)) + evalScore} PTS
                  </span>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={5000}
                  step={10}
                  value={evalScore}
                  onChange={(e) => setEvalScore(Number(e.target.value))}
                  className="font-mono text-lg font-bold text-primary h-10 bg-background"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  These writeup points are directly added to the squad's total score on the scoreboard in real-time.
                </p>
              </div>

              {/* Feedback Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Jury Feedback & Notes (Optional)
                </label>
                <Textarea
                  placeholder="Provide investigation methodology evaluation, PoC analysis quality, and recommendations for the squad..."
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  className="text-xs resize-none h-24 bg-background"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEvaluatingItem(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5">
                  {saveLoading ? 'Saving...' : 'Save & Publish Evaluation'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Writeup Dialog Modal for Admin / Jury */}
      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-outfit uppercase tracking-wider text-primary text-xl font-bold">
              <Upload className="h-5 w-5 text-primary" />
              Upload Squad Writeup (Admin / Jury)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload an official incident investigation writeup report on behalf of a specific squad to the server.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Select Squad Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center justify-between">
                <span>Select Target Squad *</span>
                {teamsLoading && <span className="text-[10px] text-muted-foreground animate-pulse">Loading squads...</span>}
              </label>
              {allTeams.length > 0 ? (
                <Select value={selectedUploadTeamId} onValueChange={setSelectedUploadTeamId}>
                  <SelectTrigger className="h-10 text-xs font-mono bg-background border-border text-foreground">
                    <SelectValue placeholder="-- Select Target Squad --" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[10005] max-h-64">
                    {allTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-xs font-mono py-2">
                        <div className="flex items-center justify-between w-full gap-4">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color || '#00F0FF' }} />
                            <span className="font-bold text-foreground">{t.name}</span>
                          </div>
                          {t.event?.name && (
                            <span className="text-[11px] text-muted-foreground font-sans bg-muted/60 px-2 py-0.5 rounded border border-border/40 truncate max-w-[200px]">
                              {t.event.name}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-xs text-muted-foreground p-2.5 border border-dashed rounded bg-muted/20">
                  {teamsLoading ? 'Loading squad list...' : 'No squads registered.'}
                </div>
              )}
            </div>

            {/* File Dropzone / Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Writeup Document File (.pdf, .zip, .rar, .docx, .md) *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetUploadFile(e.target.files[0]);
                  }
                }}
                accept=".pdf,.zip,.rar,.7z,.tar,.gz,.docx,.doc,.md,.txt"
                className="hidden"
              />

              {!selectedUploadFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      validateAndSetUploadFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2",
                    isDragOver
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/40"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-medium text-foreground">
                    Click to browse file or drag and drop here
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    Supported formats: PDF, ZIP, RAR, 7Z, DOCX, MD (Max 50MB)
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-muted/40 border border-primary/40 rounded-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold font-mono text-foreground truncate">
                        {selectedUploadFile.name}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {formatBytes(selectedUploadFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Notes / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Additional Notes / Uploader Remarks (Optional)
              </label>
              <Textarea
                placeholder="Notes from jury / organizing committee regarding this writeup file..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                className="text-xs resize-none h-20 bg-background border-border"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setUploadModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadLoading || !selectedUploadTeamId || !selectedUploadFile}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2"
              >
                {uploadLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload Squad Writeup
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Interactive Writeup Document Viewer Modal */}
      <WriteupViewerModal
        writeup={viewingWriteup}
        isOpen={Boolean(viewingWriteup)}
        onClose={() => setViewingWriteup(null)}
        isAdmin={true}
        onEvaluated={() => {
          setViewingWriteup(null);
          fetchWriteups();
        }}
      />

    </div>
  );
};
