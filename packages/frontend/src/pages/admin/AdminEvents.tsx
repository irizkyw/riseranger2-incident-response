import React, { useEffect, useState } from 'react';
import { 
  Settings, 
  Save, 
  Trash2, 
  Edit, 
  Plus, 
  Search, 
  Download, 
  RefreshCw, 
  Calendar, 
  Rocket, 
  Link2, 
  Radio, 
  Key,
  Users,
  User,
  Layers,
  Pause,
  Play,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { EventDetailModal } from '@/components/EventDetailModal';
import { toast } from 'sonner';
import api from '@/services/api';
import { formatWIBDateTime } from '@/utils/date';

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [inspectEventId, setInspectEventId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState<any>({ 
    name: '', 
    join_token: '', 
    participation_mode: 'TEAM',
    min_team_size: 1,
    max_team_size: 5,
    is_active: true, 
    start_time: '', 
    end_time: '', 
    freeze_time: '', 
    is_chained: false 
  });
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<{ id: string; name: string } | null>(null);
  const [finishEventModal, setFinishEventModal] = useState<{ id: string; name: string; is_finished: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    badgeText: string;
    badgeColor: string;
    confirmText: string;
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    confirmClassName?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data || []);
    } catch (err) {
      toast.error('Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = { ...newEvent };
      if (!payload.start_time) delete payload.start_time;
      if (!payload.end_time) delete payload.end_time;
      if (!payload.freeze_time) delete payload.freeze_time;

      await api.post('/admin/events', payload);
      toast.success('Event created successfully');
      setNewEvent({ 
        name: '', 
        join_token: '', 
        participation_mode: 'TEAM',
        min_team_size: 1,
        max_team_size: 5,
        is_active: true, 
        start_time: '', 
        end_time: '', 
        freeze_time: '', 
        is_chained: false 
      });
      setCreateOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to create event');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const payload = { ...editingEvent };
      if (!payload.start_time) delete payload.start_time;
      if (!payload.end_time) delete payload.end_time;
      if (!payload.freeze_time) delete payload.freeze_time;

      await api.put(`/admin/events/${editingEvent.id}`, payload);
      toast.success('Event updated successfully');
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to update event');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTogglePauseEvent = async (ev: any) => {
    try {
      const newPause = !ev.is_paused;
      setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, is_paused: newPause } : e));
      await api.put(`/admin/events/${ev.id}/toggle-pause`, { is_paused: newPause });
      toast.success(newPause ? `⏸️ Arena "${ev.name}" berhasil di-pause!` : `▶️ Arena "${ev.name}" berhasil dilanjutkan!`);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah status pause event');
      fetchEvents();
    }
  };

  const confirmTogglePauseEvent = (ev: any) => {
    const nextVal = !ev.is_paused;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Konfirmasi Pause Arena Event' : 'Konfirmasi Lanjutkan Arena Event',
      description: nextVal 
        ? `Apakah Anda yakin ingin menjeda (Pause) seluruh pengerjaan di arena "${ev.name}"? Stopwatch seluruh peserta akan dibekukan dan submisi dinonaktifkan sementara.`
        : `Apakah Anda yakin ingin melanjutkan kembali pengerjaan di arena "${ev.name}" untuk seluruh peserta?`,
      badgeText: nextVal ? '⏸️ PAUSE ARENA' : '▶️ RESUME ARENA',
      badgeColor: nextVal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      confirmText: nextVal ? '⏸️ Jeda Arena Sekarang' : '▶️ Lanjutkan Arena',
      confirmVariant: 'default',
      confirmClassName: nextVal ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
      onConfirm: () => handleTogglePauseEvent(ev)
    });
  };

  const handleForceFinishEvent = async (id: string, isFinished: boolean) => {
    try {
      setEvents(prev => prev.map(e => e.id === id ? { 
        ...e, 
        is_finished: isFinished, 
        is_active: isFinished ? false : true 
      } : e));
      await api.put(`/admin/events/${id}/force-finish`, { is_finished: isFinished });
      toast.success(isFinished ? '🏆 Event berhasil diselesaikan secara resmi!' : 'Arena event berhasil dibuka kembali!');
      setFinishEventModal(null);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah status selesai event');
      fetchEvents();
    }
  };


  const handleDeleteEvent = async (id: string) => {
    try {
      await api.delete(`/admin/events/${id}`);
      toast.success('Event deleted');
      setDeleteEventId(null);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const handleExportCSV = () => {
    if (events.length === 0) {
      toast.error('No events to export');
      return;
    }

    const headers = ['Event Name', 'Master Token', 'Mode', 'Max Size', 'Status', 'Chained', 'Start Time', 'End Time'];
    const rows = events.map(ev => [
      ev.name,
      ev.join_token,
      ev.participation_mode || 'TEAM',
      ev.max_team_size || 5,
      ev.is_active ? 'ACTIVE' : 'PAUSED',
      ev.is_chained ? 'CHAINED' : 'OPEN',
      ev.start_time ? new Date(ev.start_time).toISOString() : 'Open',
      ev.end_time ? new Date(ev.end_time).toISOString() : 'Open'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `riseranger_events_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Events exported to CSV');
  };

  // Filter computation
  const filteredEvents = events.filter(e => {
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.join_token.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize) || 1;
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalEvents = events.length;
  const activeEvents = events.filter(e => e.is_active).length;
  const chainedEvents = events.filter(e => e.is_chained).length;
  const teamEvents = events.filter(e => !e.participation_mode || e.participation_mode === 'TEAM').length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Event Configuration & Arenas
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {totalEvents} Arenas
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure competition arenas, schedule start/end windows, format rules (Solo / Group), and manage challenge chaining.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={() => setCreateOpen(true)} 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <Plus className="h-4 w-4" />
            Tambah Event
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Arenas</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Active Arenas</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{activeEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Radio className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-cyan-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">Chained Arenas</p>
              <h3 className="text-3xl font-black font-mono text-cyan-400 mt-1">{chainedEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Link2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-purple-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-purple-400 tracking-wider">Squad-Only Arenas</p>
              <h3 className="text-3xl font-black font-mono text-purple-400 mt-1">{teamEvents}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search event by name or token..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 bg-background h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="gap-2 text-xs border-border h-9"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchEvents}
                disabled={loading}
                className="h-9 w-9 border-border"
                title="Reload Events"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border">
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Event Arena Name</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Master Token</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Mode & Size</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Challenge Flow</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Timing Schedule</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono">
                    Loading events...
                  </TableCell>
                </TableRow>
              ) : paginatedEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Rocket className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No events found. Click "Create Event" to launch a new arena.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEvents.map((ev) => (
                  <TableRow key={ev.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div 
                        className="font-bold text-foreground text-sm flex items-center gap-2 cursor-pointer group hover:text-primary transition-colors"
                        onClick={() => setInspectEventId(ev.id)}
                        title="Klik untuk melihat diagram & statistik lengkap event ini"
                      >
                        <span className="group-hover:underline">{ev.name}</span>
                        <BarChart3 className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <code className="px-2 py-0.5 rounded bg-muted/60 font-mono text-xs font-semibold text-primary">
                        {ev.join_token}
                      </code>
                    </TableCell>

                    <TableCell>
                      {ev.participation_mode === 'INDIVIDUAL' ? (
                        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] flex items-center gap-1 w-fit font-mono">
                          <User className="h-3 w-3" /> SOLO
                        </Badge>
                      ) : ev.participation_mode === 'HYBRID' ? (
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] flex items-center gap-1 w-fit font-mono">
                          <Layers className="h-3 w-3" /> HYBRID
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] flex items-center gap-1 w-fit font-mono">
                          <Users className="h-3 w-3" /> SQUAD ({ev.min_team_size || 1} - {ev.max_team_size || 5} Anggota)
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {ev.is_chained ? (
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary bg-primary/10">
                          ⛓️ CHAINED
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          OPEN
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1 w-fit">
                        {ev.is_finished ? (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] uppercase font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <Trophy className="h-3 w-3 text-amber-400" />
                            COMPLETED
                          </Badge>
                        ) : ev.is_active ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-mono">
                            ACTIVE
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] uppercase font-mono">
                            INACTIVE
                          </Badge>
                        )}
                        {!ev.is_finished && ev.is_paused && (
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] uppercase font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                            <Pause className="h-2.5 w-2.5 text-amber-400" />
                            TIME PAUSED
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground space-y-0.5">
                      <div><span className="text-foreground font-medium">Start:</span> {ev.start_time ? formatWIBDateTime(ev.start_time) : 'Open'}</div>
                      <div><span className="text-foreground font-medium">End:</span> {ev.end_time ? formatWIBDateTime(ev.end_time) : 'Open'}</div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Event Analytics & Leaderboard */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setInspectEventId(ev.id)}
                          className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                          title="Event Analytics, Accuracy Diagrams & Leaderboard"
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span className="sr-only">Analytics</span>
                        </Button>

                        {/* Force Selesaikan Event / Buka Kembali */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setFinishEventModal({ id: ev.id, name: ev.name, is_finished: !ev.is_finished });
                          }}
                          className={`h-8 w-8 ${ev.is_finished ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                          title={ev.is_finished ? 'Buka Kembali Event Arena Ini' : 'Force Selesaikan Event Sekarang'}
                        >
                          {ev.is_finished ? <RotateCcw className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                        </Button>

                        {/* Toggle Event Pause/Resume */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => confirmTogglePauseEvent(ev)} 
                          disabled={ev.is_finished}
                          className={`h-8 w-8 ${ev.is_paused ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-400 hover:bg-amber-500/10'}`}
                          title={ev.is_paused ? 'Resume Seluruh Waktu Arena Ini' : 'Pause Seluruh Waktu Arena Ini'}
                        >
                          {ev.is_paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingEvent({
                            ...ev,
                            participation_mode: ev.participation_mode || 'TEAM',
                            min_team_size: ev.min_team_size || 1,
                            max_team_size: ev.max_team_size || 5,
                            start_time: ev.start_time ? new Date(ev.start_time).toISOString().slice(0, 16) : '',
                            end_time: ev.end_time ? new Date(ev.end_time).toISOString().slice(0, 16) : '',
                            freeze_time: ev.freeze_time ? new Date(ev.freeze_time).toISOString().slice(0, 16) : ''
                          })} 
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          title="Edit Event Configuration"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setDeleteEventId({ id: ev.id, name: ev.name })} 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete Event"
                        >
                          <Trash2 className="h-4 w-4" />
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
          totalItems={filteredEvents.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Create Event Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" /> Launch New Event Arena
            </DialogTitle>
            <DialogDescription>
              Create a new CTF competition arena with timing, tokens, participation rules, and chained mode.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent}>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Event Name</label>
                <Input placeholder="e.g., RISERANGER 2 National Grand Final" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Master Join Token (Default)</label>
                <Input placeholder="e.g., RR26-FINALS-CHAMPION" value={newEvent.join_token} onChange={(e) => setNewEvent({ ...newEvent, join_token: e.target.value.toUpperCase() })} required />
              </div>

              {/* Mode Partisipasi & Min/Max Squad Size */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Format Partisipasi</label>
                  <select
                    value={newEvent.participation_mode}
                    onChange={(e) => setNewEvent({ ...newEvent, participation_mode: e.target.value })}
                    className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TEAM">👥 Squad Only</option>
                    <option value="INDIVIDUAL">👤 Solo Only</option>
                    <option value="HYBRID">🔄 Hybrid</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Min Anggota</label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={newEvent.min_team_size || 1} 
                    onChange={(e) => setNewEvent({ ...newEvent, min_team_size: Number(e.target.value) })} 
                    disabled={newEvent.participation_mode === 'INDIVIDUAL'}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Max Anggota</label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10} 
                    value={newEvent.max_team_size} 
                    onChange={(e) => setNewEvent({ ...newEvent, max_team_size: Number(e.target.value) })} 
                    disabled={newEvent.participation_mode === 'INDIVIDUAL'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Start Time</label>
                  <Input type="datetime-local" value={newEvent.start_time} onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">End Time</label>
                  <Input type="datetime-local" value={newEvent.end_time} onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Scoreboard Freeze Time</label>
                <Input type="datetime-local" value={newEvent.freeze_time} onChange={(e) => setNewEvent({ ...newEvent, freeze_time: e.target.value })} />
              </div>

              <div className="pt-2 border-t border-border">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.is_chained || false}
                    onChange={(e) => setNewEvent({ ...newEvent, is_chained: e.target.checked })}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Chained Challenges Mode (Tantangan Berantai)</span>
                </label>
                <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                  Peserta harus menyelesaikan tantangan level awal terlebih dahulu sebelum membuka level lanjutan dalam kategori yang sama.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveLoading}>
                {saveLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Event Configuration
            </DialogTitle>
            <DialogDescription>
              Update timing, token, format mode (Solo/Squad), or operational rules for this event.
            </DialogDescription>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleUpdateEvent}>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Event Name</label>
                  <Input value={editingEvent.name} onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Master Join Token</label>
                  <Input value={editingEvent.join_token} onChange={(e) => setEditingEvent({ ...editingEvent, join_token: e.target.value.toUpperCase() })} required />
                </div>

                {/* Mode Partisipasi & Min/Max Squad Size */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Format Partisipasi</label>
                    <select
                      value={editingEvent.participation_mode || 'TEAM'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, participation_mode: e.target.value })}
                      className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="TEAM">👥 Squad Only</option>
                      <option value="INDIVIDUAL">👤 Solo Only</option>
                      <option value="HYBRID">🔄 Hybrid</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Min Anggota</label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={10} 
                      value={editingEvent.min_team_size || 1} 
                      onChange={(e) => setEditingEvent({ ...editingEvent, min_team_size: Number(e.target.value) })} 
                      disabled={editingEvent.participation_mode === 'INDIVIDUAL'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Max Anggota</label>
                    <Input 
                      type="number" 
                      min={1} 
                      max={10} 
                      value={editingEvent.max_team_size || 5} 
                      onChange={(e) => setEditingEvent({ ...editingEvent, max_team_size: Number(e.target.value) })} 
                      disabled={editingEvent.participation_mode === 'INDIVIDUAL'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Start Time</label>
                    <Input type="datetime-local" value={editingEvent.start_time} onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">End Time</label>
                    <Input type="datetime-local" value={editingEvent.end_time} onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Freeze Time</label>
                  <Input type="datetime-local" value={editingEvent.freeze_time} onChange={(e) => setEditingEvent({ ...editingEvent, freeze_time: e.target.value })} />
                </div>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEvent.is_active}
                      onChange={(e) => setEditingEvent({ ...editingEvent, is_active: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Arena Active</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingEvent.is_chained || false}
                      onChange={(e) => setEditingEvent({ ...editingEvent, is_chained: e.target.checked })}
                      className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Chained Mode</span>
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
                <Button type="submit" disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirmation Modal */}
      <Dialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Event Arena
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete event <strong>"{deleteEventId?.name}"</strong>? This will cascade-delete all associated teams, submissions, and challenges in this arena!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteEventId && handleDeleteEvent(deleteEventId.id)}>
              Delete Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Finish / Reopen Event Confirmation Modal */}
      <Dialog open={!!finishEventModal} onOpenChange={(open) => !open && setFinishEventModal(null)}>
        <DialogContent className={`sm:max-w-md ${finishEventModal?.is_finished ? 'border-amber-500/40' : 'border-emerald-500/40'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 font-outfit uppercase tracking-wider ${finishEventModal?.is_finished ? 'text-amber-400' : 'text-emerald-400'}`}>
              {finishEventModal?.is_finished ? (
                <>
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Force Selesaikan Event Arena
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5 text-emerald-400" />
                  Buka Kembali & Lanjutkan Event Arena
                </>
              )}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-foreground/80 text-xs">
              <p>
                {finishEventModal?.is_finished
                  ? <>Apakah Anda yakin ingin menyelesaikan kompetisi arena <strong>"{finishEventModal?.name}"</strong> sekarang?</>
                  : <>Apakah Anda yakin ingin membuka kembali dan melanjutkan kompetisi arena <strong>"{finishEventModal?.name}"</strong>?</>}
              </p>
              {finishEventModal?.is_finished ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono space-y-1">
                  <p>⚠️ <strong>Dampak Force Selesaikan Event:</strong></p>
                  <p>• Seluruh sesi pengerjaan peserta akan diakhiri seketika.</p>
                  <p>• Form pengiriman flag akan dikunci permanen.</p>
                  <p>• Scoreboard final akan dibekukan sebagai hasil akhir.</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono space-y-1">
                  <p>⚡ <strong>Dampak Membuka Kembali Event:</strong></p>
                  <p>• Sesi pengerjaan peserta akan diaktifkan kembali.</p>
                  <p>• Form pengiriman flag tantangan dibuka kembali.</p>
                  <p>• Scoreboard live akan aktif kembali menerima pembaruan skor.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishEventModal(null)}>Batal</Button>
            <Button 
              className={`text-white font-bold gap-1.5 ${finishEventModal?.is_finished ? 'bg-amber-600 hover:bg-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`} 
              onClick={() => finishEventModal && handleForceFinishEvent(finishEventModal.id, finishEventModal.is_finished)}
            >
              {finishEventModal?.is_finished ? (
                <>
                  <Trophy className="h-4 w-4 fill-current" />
                  Selesaikan Event Sekarang
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Buka & Lanjutkan Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal Action Confirmation Modal */}
      <Dialog open={Boolean(confirmModal?.open)} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={confirmModal?.badgeColor || 'bg-primary/20 text-primary border-primary/40'}>
                {confirmModal?.badgeText}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold font-outfit uppercase tracking-wider text-foreground">
              {confirmModal?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {confirmModal?.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(null)}
              className="border-border hover:bg-muted text-muted-foreground"
            >
              Batal
            </Button>
            <Button
              variant={confirmModal?.confirmVariant || 'default'}
              className={confirmModal?.confirmClassName}
              onClick={async () => {
                if (confirmModal?.onConfirm) {
                  await confirmModal.onConfirm();
                }
                setConfirmModal(null);
              }}
            >
              {confirmModal?.confirmText || 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EVENT STATS & PERFORMANCE MODAL */}
      <EventDetailModal
        eventId={inspectEventId}
        open={Boolean(inspectEventId)}
        onOpenChange={(open) => !open && setInspectEventId(null)}
      />
    </div>
  );
};
