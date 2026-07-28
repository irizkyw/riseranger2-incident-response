import React, { useState } from 'react';
import { Plus, Edit, Trash2, Upload, Eye, EyeOff, Shield } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

interface ChallengeCrudProps {
  challenges: any[];
  events: any[];
  categories: any[];
  onRefresh: () => void;
}

export const ChallengeCrud: React.FC<ChallengeCrudProps> = ({ challenges, events, categories, onRefresh }) => {
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: categories.length > 0 ? categories[0].name : '',
    points: 100,
    flag: '',
    hint: '',
    hint_cost: 0,
    file_url: '',
    is_active: true,
    event_id: events.length > 0 ? events[0].id : '',
  });
  const [importJson, setImportJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteChallenge, setDeleteChallenge] = useState<{ id: string, title: string } | null>(null);

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      category: categories.length > 0 ? categories[0].name : '',
      points: 100,
      flag: '',
      hint: '',
      hint_cost: 0,
      file_url: '',
      is_active: true,
      event_id: events.length > 0 ? events[0].id : '',
    });
    setOpen(true);
  };

  const handleOpenEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({
      title: c.title,
      description: c.description,
      category: c.category,
      points: c.points,
      flag: '', // Keep blank unless updating
      hint: c.hint || '',
      hint_cost: c.hint_cost || 0,
      file_url: c.file_url || '',
      is_active: c.is_active,
      event_id: c.event_id || (events.length > 0 ? events[0].id : ''),
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        const payload: any = { ...formData, points: Number(formData.points), hint_cost: Number(formData.hint_cost) };
        if (!payload.flag) delete payload.flag;
        await api.put(`/admin/challenges/${editingId}`, payload);
        toast.success('Challenge updated successfully');
      } else {
        if (!formData.flag) {
          toast.error('Flag is required for new challenge');
          setLoading(false);
          return;
        }
        await api.post('/admin/challenges', {
          ...formData,
          points: Number(formData.points),
          hint_cost: Number(formData.hint_cost),
          event_id: formData.event_id
        });
        toast.success('Challenge created successfully');
      }
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save challenge');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/challenges/${id}`);
      toast.success('Challenge deleted successfully');
      onRefresh();
    } catch (err) {
      toast.error('Failed to delete challenge');
    }
  };

  const handleBulkImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      setLoading(true);
      const res = await api.post('/admin/challenges/import', { challenges: parsed });
      toast.success(res.data.message);
      setImportOpen(false);
      setImportJson('');
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid JSON format or server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold font-outfit text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-cyber-cyan" /> Manage CTF Challenges
        </h2>
        <div className="flex items-center gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1.5 border-cyber-purple text-cyber-purple hover:bg-cyber-purple/10">
                <Upload className="h-4 w-4" /> Bulk Import JSON
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Import Challenges via JSON</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <p className="text-xs text-muted-foreground">
                  Paste a JSON array of objects with fields: <code className="text-cyber-cyan">title, description, category (WEB/CRYPTO/etc), points, flag, hint (optional), hint_cost (optional)</code>
                </p>
                <textarea
                  rows={8}
                  placeholder='[{"title":"Web 101","description":"Inspect element","category":"WEB","points":100,"flag":"CTF{easy_web}"}]'
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full bg-black/60 border border-border rounded-md p-3 font-mono text-xs text-white focus:outline-none focus:border-cyber-cyan"
                />
              </div>
              <DialogFooter>
                <Button variant="cyber" onClick={handleBulkImport} disabled={loading || !importJson.trim()}>
                  {loading ? 'Importing...' : 'Import Challenges'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="cyber" onClick={handleOpenCreate} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Challenge
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Edit Challenge' : 'Create New Challenge'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Title</label>
                    <Input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-white focus:border-cyber-cyan"
                    >
                      <option value="" disabled>Select Category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Event Assignment</label>
                  <select
                    required
                    value={formData.event_id}
                    onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-white focus:border-cyber-cyan"
                  >
                    <option value="" disabled>Select Event...</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Description</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-md border border-input bg-background/60 p-3 text-sm text-white focus:border-cyber-cyan focus:outline-none font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Points</label>
                    <Input type="number" required value={formData.points} onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Flag {editingId && '(Leave empty to keep current)'}</label>
                    <Input placeholder="CTF{...}" required={!editingId} value={formData.flag} onChange={(e) => setFormData({ ...formData, flag: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Hint (Optional)</label>
                    <Input placeholder="Hint text..." value={formData.hint} onChange={(e) => setFormData({ ...formData, hint: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Hint Cost (Points)</label>
                    <Input type="number" value={formData.hint_cost} onChange={(e) => setFormData({ ...formData, hint_cost: Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-cyber-cyan uppercase font-outfit">Attachment URL (Optional)</label>
                  <Input placeholder="https://..." value={formData.file_url} onChange={(e) => setFormData({ ...formData, file_url: e.target.value })} />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-cyber-cyan focus:ring-cyber-cyan"
                  />
                  <label htmlFor="is_active" className="text-sm text-white font-outfit">Active / Visible to Participants</label>
                </div>

                <DialogFooter>
                  <Button type="submit" variant="cyber" disabled={loading} className="w-full">
                    {loading ? 'Saving...' : editingId ? 'Update Challenge' : 'Create Challenge'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Solves</TableHead>
            <TableHead className="text-right">First Blood</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {challenges.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                {c.is_active ? (
                  <Badge variant="green" className="flex items-center gap-1 w-fit"><Eye className="h-3 w-3" /> Active</Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1 w-fit"><EyeOff className="h-3 w-3" /> Hidden</Badge>
                )}
              </TableCell>
              <TableCell className="font-bold text-white">{c.title}</TableCell>
              <TableCell><Badge variant="secondary">{c.event?.name || 'Unknown'}</Badge></TableCell>
              <TableCell><Badge variant="outline">{c.category}</Badge></TableCell>
              <TableCell className="text-right font-mono font-bold text-cyber-cyan">{c.points}</TableCell>
              <TableCell className="text-right font-mono">{c._count?.submissions || 0}</TableCell>
              <TableCell className="text-right font-mono text-xs text-yellow-400">
                {c.first_blood ? c.first_blood.team.name : 'None yet'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="icon" onClick={() => handleOpenEdit(c)} className="h-8 w-8 text-cyber-cyan">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => setDeleteChallenge({ id: c.id, title: c.title })} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteChallenge} onOpenChange={(open) => !open && setDeleteChallenge(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Challenge</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the challenge <strong>{deleteChallenge?.title}</strong>? This action will permanently remove all related submissions and first blood records!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteChallenge(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              if (deleteChallenge) handleDelete(deleteChallenge.id);
              setDeleteChallenge(null);
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
