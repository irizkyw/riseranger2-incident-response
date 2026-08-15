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
  Layers
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState<any>({ 
    name: '', 
    join_token: '', 
    participation_mode: 'TEAM',
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

        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Event
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
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span>{ev.name}</span>
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
                          <Users className="h-3 w-3" /> SQUAD (Max {ev.max_team_size || 5})
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
                      {ev.is_active ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-mono">
                          ACTIVE
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px] uppercase font-mono">
                          PAUSED
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-muted-foreground space-y-0.5">
                      <div><span className="text-foreground font-medium">Start:</span> {ev.start_time ? new Date(ev.start_time).toLocaleString() : 'Open'}</div>
                      <div><span className="text-foreground font-medium">End:</span> {ev.end_time ? new Date(ev.end_time).toLocaleString() : 'Open'}</div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setEditingEvent({
                            ...ev,
                            participation_mode: ev.participation_mode || 'TEAM',
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
              <Settings className="h-5 w-5 text-primary" /> Create New Event Arena
            </DialogTitle>
            <DialogDescription>
              Launch a new CTF event with specific challenge packages, team formats, and scoreboard rankings.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent}>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Event Name</label>
                <Input value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="e.g. CTF Kategori Mahasiswa 2026" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Master Join Token</label>
                <Input value={newEvent.join_token} onChange={(e) => setNewEvent({ ...newEvent, join_token: e.target.value.toUpperCase() })} placeholder="e.g. MAHA2026" required />
              </div>

              {/* Mode Partisipasi & Max Squad Size */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Format Partisipasi</label>
                  <select
                    value={newEvent.participation_mode}
                    onChange={(e) => setNewEvent({ ...newEvent, participation_mode: e.target.value })}
                    className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TEAM">👥 Squad Only (Wajib Tim)</option>
                    <option value="INDIVIDUAL">👤 Solo Only (Individu)</option>
                    <option value="HYBRID">🔄 Hybrid (Solo / Tim)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Max Anggota per Tim</label>
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

                {/* Mode Partisipasi & Max Squad Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Format Partisipasi</label>
                    <select
                      value={editingEvent.participation_mode || 'TEAM'}
                      onChange={(e) => setEditingEvent({ ...editingEvent, participation_mode: e.target.value })}
                      className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="TEAM">👥 Squad Only (Wajib Tim)</option>
                      <option value="INDIVIDUAL">👤 Solo Only (Individu)</option>
                      <option value="HYBRID">🔄 Hybrid (Solo / Tim)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Max Anggota per Tim</label>
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
    </div>
  );
};
