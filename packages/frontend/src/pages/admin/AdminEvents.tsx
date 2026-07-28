import React, { useEffect, useState } from 'react';
import { Settings, Save, Trash2, Edit, X, Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [newEvent, setNewEvent] = useState<any>({ name: '', join_token: '', is_active: true, start_time: '', end_time: '', freeze_time: '' });
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data);
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
      toast.success('Event created');
      setNewEvent({ name: '', join_token: '', is_active: true, start_time: '', end_time: '', freeze_time: '' });
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
      toast.success('Event updated');
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
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Events...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">Event Configuration</h1>
            <p className="text-muted-foreground mt-1">Manage global event settings, timers, and phases</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search events..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Button variant="default" onClick={() => setCreateOpen(true)} className="flex items-center gap-2 ml-2">
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        </div>
      </div>

      <div className="space-y-6">
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> Create New Event
            </DialogTitle>
            <DialogDescription>
              Create a new CTF event to isolate challenges and participants.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateEvent}>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Event Name</label>
                <Input value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} placeholder="e.g. Mahasiswa CTF" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Join Token (Code)</label>
                <Input value={newEvent.join_token} onChange={(e) => setNewEvent({ ...newEvent, join_token: e.target.value })} placeholder="e.g. MAHA2026" required />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Start Time (Local)</label>
                <Input type="datetime-local" value={newEvent.start_time} onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">End Time (Local)</label>
                <Input type="datetime-local" value={newEvent.end_time} onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Scoreboard Freeze Time (Local)</label>
                <Input type="datetime-local" value={newEvent.freeze_time} onChange={(e) => setNewEvent({ ...newEvent, freeze_time: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" variant="default" disabled={saveLoading}>
                {saveLoading ? 'Creating...' : 'Create Event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

        <div className="grid gap-4">
          {events.filter(e => e.name.toLowerCase().includes(search.toLowerCase())).map(event => (
            <Card key={event.id} className="border bg-card shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-bold text-lg">{event.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono mb-2">Token: {event.join_token}</p>
                  <div className="flex gap-4 text-xs font-mono text-muted-foreground">
                    <div><span className="text-foreground">Start:</span> {event.start_time ? new Date(event.start_time).toLocaleString() : 'Not Set'}</div>
                    <div><span className="text-foreground">End:</span> {event.end_time ? new Date(event.end_time).toLocaleString() : 'Not Set'}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditingEvent({
                    ...event,
                    start_time: event.start_time ? new Date(new Date(event.start_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '',
                    end_time: event.end_time ? new Date(new Date(event.end_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : '',
                    freeze_time: event.freeze_time ? new Date(new Date(event.freeze_time).getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().slice(0, 16) : ''
                  })}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteEventId(event.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Event
            </DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <form onSubmit={handleUpdateEvent}>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Event Name</label>
                  <Input value={editingEvent.name} onChange={(e) => setEditingEvent({ ...editingEvent, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Join Token (Code)</label>
                  <Input value={editingEvent.join_token} onChange={(e) => setEditingEvent({ ...editingEvent, join_token: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Start Time (Local)</label>
                  <Input type="datetime-local" value={editingEvent.start_time || ''} onChange={(e) => setEditingEvent({ ...editingEvent, start_time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">End Time (Local)</label>
                  <Input type="datetime-local" value={editingEvent.end_time || ''} onChange={(e) => setEditingEvent({ ...editingEvent, end_time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Scoreboard Freeze Time (Local)</label>
                  <Input type="datetime-local" value={editingEvent.freeze_time || ''} onChange={(e) => setEditingEvent({ ...editingEvent, freeze_time: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
                <Button type="submit" variant="default" disabled={saveLoading}>
                  {saveLoading ? 'Saving...' : 'Update Event'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteEventId} onOpenChange={(open) => !open && setDeleteEventId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>Are you sure you want to delete this event? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEventId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteEventId) handleDeleteEvent(deleteEventId);
              setDeleteEventId(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
