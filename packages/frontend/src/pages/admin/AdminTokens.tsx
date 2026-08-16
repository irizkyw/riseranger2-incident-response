import React, { useEffect, useState } from 'react';
import { Key, Plus, Copy, Check, RefreshCw, Trash2, Download, Search, ShieldCheck, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminTokens: React.FC = () => {
  const [tokens, setTokens] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'USED'>('ALL');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({ total: 0, used: 0, available: 0 });
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);


  // Generate modal
  const [generateOpen, setGenerateOpen] = useState(false);
  const [genEventId, setGenEventId] = useState('');
  const [genCount, setGenCount] = useState(10);
  const [genPrefix, setGenPrefix] = useState('RR26');
  const [genLabel, setGenLabel] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  // Action modals
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; token: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: string; token: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Copied tracking
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data);
      if (res.data.length > 0 && !genEventId) {
        setGenEventId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedEventId !== 'ALL') params.event_id = selectedEventId;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const res = await api.get('/admin/tokens', { params });
      setTokens(res.data.tokens || []);
      setStats(res.data.stats || { total: 0, used: 0, available: 0 });
    } catch (err) {
      toast.error('Failed to load single-use tokens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [selectedEventId, statusFilter]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEventId) {
      toast.error('Please select an event');
      return;
    }
    setGenLoading(true);
    try {
      const res = await api.post('/admin/tokens/generate', {
        event_id: genEventId,
        count: Number(genCount) || 10,
        prefix: genPrefix || 'RR26',
        label: genLabel || undefined
      });
      toast.success(res.data.message || 'Tokens generated successfully!');
      setGenerateOpen(false);
      setGenLabel('');
      fetchTokens();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to generate tokens');
    } finally {
      setGenLoading(false);
    }
  };

  const handleCopy = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    toast.success(`Copied ${token} to clipboard!`);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleCopyAllAvailable = () => {
    const availableTokens = filteredTokens.filter(t => !t.is_used).map(t => t.token).join('\n');
    if (!availableTokens) {
      toast.error('No available tokens to copy.');
      return;
    }
    navigator.clipboard.writeText(availableTokens);
    toast.success(`Copied ${filteredTokens.filter(t => !t.is_used).length} unused tokens to clipboard!`);
  };

  const handleExportCSV = () => {
    if (filteredTokens.length === 0) {
      toast.error('No tokens to export');
      return;
    }
    const headers = ['Token', 'Event', 'Label', 'Status', 'Used By User', 'Used By Team', 'Used At'];
    const rows = filteredTokens.map(t => [
      t.token,
      t.event?.name || '',
      t.label || '',
      t.is_used ? 'USED' : 'AVAILABLE',
      t.used_by_user?.username || '',
      t.used_by_user?.team_member?.team?.name || '',
      t.used_at ? new Date(t.used_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_access_tokens_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tokens exported to CSV!');
  };

  const handleConfirmReset = async () => {
    if (!resetTarget) return;
    setActionLoading(true);
    try {
      await api.put(`/admin/tokens/${resetTarget.id}/reset`);
      toast.success(`Token ${resetTarget.token} successfully reset to available.`);
      setResetTarget(null);
      fetchTokens();
    } catch (err) {
      toast.error('Failed to reset token');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/tokens/${deleteTarget.id}`);
      toast.success(`Token ${deleteTarget.token} deleted.`);
      setDeleteTarget(null);
      fetchTokens();
    } catch (err) {
      toast.error('Failed to delete token');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredTokens = tokens.filter(t => {
    const q = search.toLowerCase();
    return (
      t.token.toLowerCase().includes(q) ||
      (t.label && t.label.toLowerCase().includes(q)) ||
      (t.used_by_user?.username && t.used_by_user.username.toLowerCase().includes(q)) ||
      (t.used_by_user?.team_member?.team?.name && t.used_by_user.team_member.team.name.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.ceil(filteredTokens.length / pageSize) || 1;
  const paginatedTokens = filteredTokens.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (val: 'ALL' | 'AVAILABLE' | 'USED') => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleEventFilterChange = (val: string) => {
    setSelectedEventId(val);
    setCurrentPage(1);
  };


  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Single-Use Access Tokens
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Anti-Cheat</Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Generate and issue one-time access tokens per team to prevent token reuse and smurfing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setGenerateOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate Batch
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Generated</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Key className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Available (Unused)</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{stats.available}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-rose-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-400 tracking-wider">Used / Burned</p>
              <h3 className="text-3xl font-black font-mono text-rose-400 mt-1">{stats.used}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select
            value={selectedEventId}
            onChange={(e) => handleEventFilterChange(e.target.value)}
            className="h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <div className="flex items-center rounded-md border border-input bg-background p-0.5 text-xs">
            <button
              onClick={() => handleStatusFilterChange('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilterChange('AVAILABLE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Available
            </button>
            <button
              onClick={() => handleStatusFilterChange('USED')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'USED' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Used
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search token, user, team..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleCopyAllAvailable} className="h-9 text-xs gap-1.5" title="Copy all available tokens">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Copy Unused</span>
          </Button>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchTokens} className="h-9 w-9" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tokens Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase">Token Code</TableHead>
                <TableHead className="text-xs uppercase">Event</TableHead>
                <TableHead className="text-xs uppercase">Label / Batch</TableHead>
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase">Claimed By</TableHead>
                <TableHead className="text-xs uppercase">Claimed At</TableHead>
                <TableHead className="text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono">
                    Loading tokens...
                  </TableCell>
                </TableRow>
              ) : paginatedTokens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Key className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No tokens found. Click "Generate Batch" to create single-use tokens.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTokens.map((t) => {
                  const isCopied = copiedToken === t.token;
                  return (
                    <TableRow key={t.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 rounded bg-muted/60 font-mono text-xs font-bold tracking-wider text-primary select-all">
                            {t.token}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(t.token)}
                            title="Copy Token"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {t.event?.name || '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.label || <span className="italic text-muted-foreground/50">Unlabeled</span>}
                      </TableCell>
                      <TableCell>
                        {t.is_used ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] font-semibold uppercase">
                            USED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase">
                            AVAILABLE
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {t.used_by_user ? (
                          <div>
                            <span className="font-semibold text-foreground">@{t.used_by_user.username}</span>
                            {t.used_by_user.team_member?.team && (
                              <span className="text-muted-foreground block text-[11px]">
                                Team: {t.used_by_user.team_member.team.name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/40 font-mono text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {t.used_at ? new Date(t.used_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {t.is_used && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-yellow-400"
                              onClick={() => setResetTarget({ id: t.id, token: t.token })}
                              title="Reset Token to Available"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget({ id: t.id, token: t.token })}
                            title="Delete Token"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredTokens.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>


      {/* Generate Batch Modal */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Generate Single-Use Tokens
            </DialogTitle>
            <DialogDescription>
              Generate unique, one-time registration tokens for teams. Once used, a token is permanently burned.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Target Event</label>
              <select
                value={genEventId}
                onChange={(e) => setGenEventId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-background border border-input text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name} ({ev.is_active ? 'Active' : 'Inactive'})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={genCount}
                  onChange={(e) => setGenCount(Math.min(200, Math.max(1, Number(e.target.value) || 1)))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Prefix (e.g. RR26, MAHA)</label>
                <Input
                  value={genPrefix}
                  onChange={(e) => setGenPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="RR26"
                  maxLength={8}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Batch Label / Note (Optional)</label>
              <Input
                value={genLabel}
                onChange={(e) => setGenLabel(e.target.value)}
                placeholder="e.g. Universitas Batch A / Finalist Team"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setGenerateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={genLoading}>
                {genLoading ? 'Generating...' : `Generate ${genCount} Tokens`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <RefreshCw className="h-5 w-5" />
              Reset Token
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset token <strong className="text-foreground font-mono font-bold select-all">{resetTarget?.token}</strong> back to <strong className="text-emerald-400">AVAILABLE</strong> state? The previous user/team claim will be unlinked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setResetTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={handleConfirmReset} disabled={actionLoading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
              {actionLoading ? 'Resetting...' : 'Reset to Available'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete access token <strong className="text-foreground font-mono font-bold select-all">{deleteTarget?.token}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDelete} disabled={actionLoading}>
              {actionLoading ? 'Deleting...' : 'Delete Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
