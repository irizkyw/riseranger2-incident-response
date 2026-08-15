import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  RefreshCw, 
  Trophy, 
  Copy, 
  Check, 
  Activity,
  Plus,
  Eye,
  Edit,
  Trash2,
  UserX,
  Sparkles,
  Rocket,
  Shield,
  FileSpreadsheet,
  Upload,
  FileDown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
  const [eventFilter, setEventFilter] = useState<string>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals state
  const [inspectTeam, setInspectTeam] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', invite_code: '', event_id: '', color: '#00F0FF', score: 0 });
  const [editTeam, setEditTeam] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string; is_banned: boolean } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Import from XLSX state
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importDefaultEventId, setImportDefaultEventId] = useState('');
  const [importLoading, setImportLoading] = useState(false);


  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data || []);
      if (res.data.length > 0 && !newTeam.event_id) {
        setNewTeam(prev => ({ ...prev, event_id: res.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/teams');
      setTeams(res.data || []);
      
      // Update inspectTeam if open
      if (inspectTeam) {
        const updated = res.data.find((t: any) => t.id === inspectTeam.id);
        if (updated) setInspectTeam(updated);
      }
    } catch (err) {
      toast.error('Failed to load teams data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeam.name.trim() || !newTeam.event_id) {
      toast.error('Team name and event are required');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/admin/teams', newTeam);
      toast.success(res.data.message || 'Squad created successfully!');
      setCreateOpen(false);
      setNewTeam({ name: '', invite_code: '', event_id: events[0]?.id || '', color: '#00F0FF', score: 0 });
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create squad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTeam) return;

    setActionLoading(true);
    try {
      const res = await api.put(`/admin/teams/${editTeam.id}`, {
        name: editTeam.name,
        invite_code: editTeam.invite_code,
        score: Number(editTeam.score),
        color: editTeam.color,
        event_id: editTeam.event_id
      });
      toast.success(res.data.message || 'Squad updated successfully!');
      setEditTeam(null);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update squad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/teams/${deleteTarget.id}`);
      toast.success(`Squad "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      if (inspectTeam?.id === deleteTarget.id) setInspectTeam(null);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete squad');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBan = async () => {
    if (!banTarget) return;
    setActionLoading(true);
    try {
      const newStatus = !banTarget.is_banned;
      const res = await api.post(`/admin/teams/${banTarget.id}/ban`, { is_banned: newStatus });
      toast.success(res.data.message || `Team ${banTarget.name} status updated`);
      setBanTarget(null);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update team ban status');
    } finally {
      setActionLoading(false);
    }
  };

  const [removeMemberTarget, setRemoveMemberTarget] = useState<{ teamId: string; userId: string; username: string } | null>(null);

  const handleConfirmRemoveMember = async () => {
    if (!removeMemberTarget) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/teams/${removeMemberTarget.teamId}/members/${removeMemberTarget.userId}`);
      toast.success(`@${removeMemberTarget.username} removed from squad.`);
      setRemoveMemberTarget(null);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    } finally {
      setActionLoading(false);
    }
  };


  const handleDownloadSquadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const defaultEvName = events[0]?.name || 'CTF Kategori Mahasiswa 2026';
    const sampleRows = [
      { name: 'Team Alpha', event_name: defaultEvName, invite_code: 'ALPHA26', color: '#00F0FF', score: 0 },
      { name: 'Team Beta', event_name: defaultEvName, invite_code: 'BETA26', color: '#FF0055', score: 0 },
      { name: 'Team Omega', event_name: events[1]?.name || 'CTF Kategori Umum 2026', invite_code: 'OMEGA26', color: '#00FF66', score: 0 }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Squads');
    
    if (format === 'csv') {
      XLSX.writeFile(workbook, 'Template_Import_Squads.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Squads.xlsx');
    }
    toast.success(`Template ${format.toUpperCase()} berhasil diunduh.`);
  };

  const handleSquadFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          toast.error('File spreadsheet kosong atau tidak terbaca.');
          return;
        }

        setImportData(data);
        toast.success(`Berhasil membaca ${data.length} baris tim dari file.`);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        toast.error('Gagal membaca file spreadsheet. Pastikan format .xlsx atau .csv valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessSquadImport = async () => {
    if (importData.length === 0) {
      toast.error('Tidak ada data tim yang akan diimpor.');
      return;
    }

    setImportLoading(true);
    try {
      const res = await api.post('/admin/teams/import', {
        teams: importData,
        default_event_id: importDefaultEventId || events[0]?.id
      });

      toast.success(res.data.message || 'Import tim berhasil!');
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn('Import warnings:', res.data.errors);
      }
      setImportOpen(false);
      setImportData([]);
      setImportFileName('');
      fetchTeams();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memproses import tim.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied invite code: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };


  const handleExportCSV = () => {
    if (filteredTeams.length === 0) {
      toast.error('No teams to export');
      return;
    }

    const headers = ['Team Name', 'Event', 'Invite Code', 'Status', 'Members Count', 'Score', 'Solves Count'];
    const rows = filteredTeams.map(t => [
      t.name,
      t.event?.name || '',
      t.invite_code,
      t.is_banned ? 'BANNED' : 'ACTIVE',
      t._count?.members || t.members?.length || 0,
      t.score,
      t._count?.submissions || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_teams_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Teams exported to CSV!');
  };

  // Filter computation
  const filteredTeams = teams.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = 
      t.name.toLowerCase().includes(q) || 
      t.invite_code.toLowerCase().includes(q) ||
      (t.members && t.members.some((m: any) => m.user?.username?.toLowerCase().includes(q) || m.user?.email?.toLowerCase().includes(q)));

    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && !t.is_banned) || 
      (statusFilter === 'BANNED' && t.is_banned);

    const matchesEvent = eventFilter === 'ALL' || t.event_id === eventFilter;

    return matchesSearch && matchesStatus && matchesEvent;
  });

  const totalPages = Math.ceil(filteredTeams.length / pageSize) || 1;
  const paginatedTeams = filteredTeams.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalTeams = teams.length;
  const activeTeams = teams.filter(t => !t.is_banned).length;
  const bannedTeams = teams.filter(t => t.is_banned).length;
  const totalScoreAccumulated = teams.reduce((acc, t) => acc + (t.score || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Team Moderation & Squads
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {totalTeams} Squads
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inspect squad rosters, pre-create empty teams, manage member rosters, and moderate bans.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setImportOpen(true)} 
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Squads (XLSX)
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Squad (Empty)
          </Button>
        </div>

      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Squads</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalTeams}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-emerald-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">Active Teams</p>
              <h3 className="text-3xl font-black font-mono text-emerald-400 mt-1">{activeTeams}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-rose-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-400 tracking-wider">Disqualified / Banned</p>
              <h3 className="text-3xl font-black font-mono text-rose-400 mt-1">{bannedTeams}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Total Arena PTS</p>
              <h3 className="text-3xl font-black font-mono text-amber-400 mt-1">{totalScoreAccumulated}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          {/* Event Filter */}
          <select 
            value={eventFilter}
            onChange={(e) => { setEventFilter(e.target.value); setCurrentPage(1); }}
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
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All Teams
            </button>
            <button
              onClick={() => { setStatusFilter('ACTIVE'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Active
            </button>
            <button
              onClick={() => { setStatusFilter('BANNED'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${statusFilter === 'BANNED' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Banned
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search team, invite code, user..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchTeams} className="h-9 w-9" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Teams Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase">Status</TableHead>
                <TableHead className="text-xs uppercase">Team Squad</TableHead>
                <TableHead className="text-xs uppercase">Event Arena</TableHead>
                <TableHead className="text-xs uppercase">Invite Code</TableHead>
                <TableHead className="text-xs uppercase text-right">Roster</TableHead>
                <TableHead className="text-xs uppercase text-right">Total Score</TableHead>
                <TableHead className="text-xs uppercase text-right">Actions & Moderation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-mono">
                    Loading teams...
                  </TableCell>
                </TableRow>
              ) : paginatedTeams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No teams found matching your criteria. Click "Create Squad" to pre-create a team.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTeams.map((t) => {
                  const isCopied = copiedCode === t.invite_code;
                  const memberCount = t._count?.members ?? t.members?.length ?? 0;
                  return (
                    <TableRow key={t.id} className="border-border hover:bg-muted/30">
                      <TableCell>
                        {t.is_banned ? (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] font-semibold uppercase flex items-center gap-1 w-fit">
                            <ShieldAlert className="h-3 w-3" /> BANNED
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold uppercase flex items-center gap-1 w-fit">
                            <ShieldCheck className="h-3 w-3" /> ACTIVE
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell>
                        <div 
                          className="flex items-center gap-2.5 cursor-pointer group"
                          onClick={() => setInspectTeam(t)}
                          title="Click to inspect team roster"
                        >
                          <Avatar className="h-8 w-8 border border-border group-hover:border-primary/50 transition-colors">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {t.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-bold text-foreground text-sm group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {t.name}
                              <Eye className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                            </span>
                            {memberCount === 0 ? (
                              <span className="text-[10px] text-amber-400 font-medium">Empty Squad (Awaiting Operatives)</span>
                            ) : (
                              <div className="text-[11px] text-muted-foreground">
                                {t.members?.map((m: any) => `@${m.user?.username}`).join(', ') || `${memberCount} members`}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground font-medium">
                        {t.event?.name || 'Main Event'}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono">
                          <code className="px-2 py-0.5 rounded bg-muted/60 text-xs font-semibold tracking-wider text-muted-foreground select-all">
                            {t.invite_code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => handleCopy(t.invite_code)}
                            title="Copy Invite Code"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-mono font-medium text-xs">
                        <button 
                          onClick={() => setInspectTeam(t)} 
                          className="hover:underline hover:text-primary font-bold"
                        >
                          {memberCount} Operatives
                        </button>
                      </TableCell>

                      <TableCell className="text-right font-mono font-bold text-primary text-sm">
                        {t.score} PTS
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setInspectTeam(t)}
                            className="h-7 px-2 text-xs gap-1"
                            title="Inspect Team & Roster"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Inspect</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditTeam(t)}
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Edit Squad Details"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant={t.is_banned ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setBanTarget({ id: t.id, name: t.name, is_banned: t.is_banned })}
                            className={`h-7 px-2 text-xs ${t.is_banned ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-rose-400 hover:bg-rose-500/10 border-rose-500/30'}`}
                          >
                            {t.is_banned ? 'Unban' : 'Ban'}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget({ id: t.id, name: t.name })}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Delete Squad"
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
          totalItems={filteredTeams.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* INSPECT TEAM ROSTER & DETAILS MODAL */}
      <Dialog open={!!inspectTeam} onOpenChange={(open) => !open && setInspectTeam(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/40">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
                    {inspectTeam?.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                    {inspectTeam?.name}
                    {inspectTeam?.is_banned ? (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-rose-500/10 text-rose-400 border-rose-500/30 font-medium">
                        Banned
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Active Squad
                      </Badge>
                    )}

                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Event: {inspectTeam?.event?.name || 'General Arena'} • Score: <strong className="text-primary font-mono">{inspectTeam?.score} PTS</strong>
                  </DialogDescription>
                </div>
              </div>

              {inspectTeam?.invite_code && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(inspectTeam.invite_code)}
                  className="h-8 gap-1.5 font-mono text-xs"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{inspectTeam.invite_code}</span>
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Roster Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  Operatives Roster ({inspectTeam?.members?.length || 0})
                </h4>
              </div>

              {!inspectTeam?.members || inspectTeam.members.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-xs text-muted-foreground">
                  No operatives have joined this squad yet. Participants can join using invite code <strong className="text-foreground font-mono">{inspectTeam?.invite_code}</strong>.
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
                  {inspectTeam.members.map((m: any) => {
                    const isLeader = m.user_id === inspectTeam.leader_id;
                    return (
                      <div key={m.id || m.user_id} className="p-3 flex items-center justify-between hover:bg-muted/20">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs font-semibold">
                              {m.user?.username?.slice(0, 2).toUpperCase() || 'OP'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                              @{m.user?.username || 'unknown'}
                              {isLeader && (
                                <Badge variant="outline" className="text-[9px] bg-yellow-400/10 text-yellow-400 border-yellow-400/30">
                                  👑 Leader
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[9px] font-mono">
                                {m.user?.role || 'PARTICIPANT'}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {m.user?.email || 'N/A'} • Joined: {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveMemberTarget({ teamId: inspectTeam.id, userId: m.user_id, username: m.user?.username || 'operative' })}
                          className="h-8 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Remove member from team"
                        >
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Solved Challenges Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                Solved Challenges History ({inspectTeam?.submissions?.length || 0})
              </h4>

              {!inspectTeam?.submissions || inspectTeam.submissions.length === 0 ? (
                <div className="p-4 rounded-lg bg-muted/30 border border-border text-center text-xs text-muted-foreground">
                  No flags submitted by this team yet.
                </div>
              ) : (
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card max-h-52 overflow-y-auto">
                  {inspectTeam.submissions.map((sub: any) => (
                    <div key={sub.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground">{sub.challenge?.title || 'Unknown Challenge'}</span>
                        <span className="text-muted-foreground ml-2 font-mono">({sub.challenge?.category})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-emerald-400 font-bold">+{sub.challenge?.points} PTS</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{new Date(sub.submitted_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20">
            <Button variant="outline" onClick={() => setInspectTeam(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REMOVE MEMBER CONFIRMATION MODAL */}
      <Dialog open={!!removeMemberTarget} onOpenChange={(open) => !open && setRemoveMemberTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <UserX className="h-5 w-5" />
              Remove Operative from Squad
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove operative <strong>@{removeMemberTarget?.username}</strong> from this team?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveMemberTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={handleConfirmRemoveMember}>
              {actionLoading ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE SQUAD (PRE-CREATED / EMPTY TEAM) MODAL */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Create Squad (Pre-created Team)
            </DialogTitle>
            <DialogDescription>
              Create an empty team ahead of time. Participants can join this team directly using the assigned invite code.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTeam} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Squad / Team Name</label>
              <Input
                placeholder="e.g. CyberVanguard, NullSec"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Target Event Arena</label>
              <select
                value={newTeam.event_id}
                onChange={(e) => setNewTeam({ ...newTeam, event_id: e.target.value })}
                className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Custom Invite Code (Optional)</label>
              <Input
                placeholder="Leave blank to auto-generate (e.g. SQUAD26)"
                value={newTeam.invite_code}
                onChange={(e) => setNewTeam({ ...newTeam, invite_code: e.target.value.toUpperCase() })}
              />
              <span className="text-[10px] text-muted-foreground">If blank, an 8-character hex code will be created.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Initial Score</label>
                <Input
                  type="number"
                  value={newTeam.score}
                  onChange={(e) => setNewTeam({ ...newTeam, score: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Theme Color</label>
                <Input
                  type="color"
                  value={newTeam.color}
                  onChange={(e) => setNewTeam({ ...newTeam, color: e.target.value })}
                  className="h-9 p-1 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? 'Creating...' : 'Create Squad'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT SQUAD MODAL */}
      <Dialog open={!!editTeam} onOpenChange={(open) => !open && setEditTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              Edit Squad Settings
            </DialogTitle>
            <DialogDescription>
              Update name, invite code, or score for squad "{editTeam?.name}".
            </DialogDescription>
          </DialogHeader>

          {editTeam && (
            <form onSubmit={handleUpdateTeam} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Squad Name</label>
                <Input
                  value={editTeam.name}
                  onChange={(e) => setEditTeam({ ...editTeam, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Invite Code</label>
                <Input
                  value={editTeam.invite_code}
                  onChange={(e) => setEditTeam({ ...editTeam, invite_code: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Score (PTS)</label>
                  <Input
                    type="number"
                    value={editTeam.score}
                    onChange={(e) => setEditTeam({ ...editTeam, score: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Theme Color</label>
                  <Input
                    type="color"
                    value={editTeam.color || '#00F0FF'}
                    onChange={(e) => setEditTeam({ ...editTeam, color: e.target.value })}
                    className="h-9 p-1 cursor-pointer"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* BAN / UNBAN CONFIRMATION MODAL */}
      <Dialog open={!!banTarget} onOpenChange={(open) => !open && setBanTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${banTarget?.is_banned ? 'text-emerald-400' : 'text-destructive'}`}>
              {banTarget?.is_banned ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              {banTarget?.is_banned ? 'Unban Squad' : 'Disqualify / Ban Squad'}
            </DialogTitle>
            <DialogDescription>
              {banTarget?.is_banned
                ? `Are you sure you want to reinstate squad "${banTarget?.name}"? They will appear on the scoreboard again.`
                : `Are you sure you want to disqualify squad "${banTarget?.name}"? They will be hidden from the official scoreboard.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>Cancel</Button>
            <Button 
              variant={banTarget?.is_banned ? 'default' : 'destructive'} 
              disabled={actionLoading} 
              onClick={handleToggleBan}
            >
              {actionLoading ? 'Processing...' : (banTarget?.is_banned ? 'Unban Squad' : 'Disqualify Squad')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE SQUAD CONFIRMATION MODAL */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Squad Team
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete squad <strong>"{deleteTarget?.name}"</strong>? This will permanently delete the team, remove all members, and purge all submitted flags from this team.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={handleDeleteTeam}>
              {actionLoading ? 'Deleting...' : 'Delete Squad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* IMPORT SQUADS FROM XLSX / CSV MODAL */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit text-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Squads from Spreadsheet (XLSX / CSV)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload file Excel (.xlsx / .xls) atau CSV yang memuat daftar tim. Unduh template jika belum memiliki format yang sesuai.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template Download Buttons */}
            <div className="p-3 bg-muted/40 border border-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Unduh Format Spreadsheet Resmi</p>
                <p className="text-[11px] text-muted-foreground">Kolom: name, event_name, invite_code, color, score</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadSquadTemplate('xlsx')}
                  className="gap-1.5 text-xs h-8"
                >
                  <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                  Template .XLSX
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadSquadTemplate('csv')}
                  className="gap-1.5 text-xs h-8"
                >
                  <FileDown className="h-3.5 w-3.5 text-primary" />
                  Template .CSV
                </Button>
              </div>
            </div>

            {/* Default Event Fallback */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Default Target Event Arena</label>
              <select
                value={importDefaultEventId}
                onChange={(e) => setImportDefaultEventId(e.target.value)}
                className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Digunakan jika baris pada file spreadsheet tidak mencantumkan nama event atau event tidak cocok.
              </p>
            </div>

            {/* File Upload Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Pilih File Spreadsheet</label>
              <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-lg p-6 text-center bg-card">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <p className="text-xs font-medium text-foreground mb-1">
                  {importFileName ? (
                    <span className="text-primary font-bold">{importFileName}</span>
                  ) : (
                    'Klik untuk memilih file .xlsx / .xls / .csv'
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground mb-3">Maksimum hingga 500 baris data sekaligus.</p>
                <Input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleSquadFileChange}
                  className="max-w-xs mx-auto h-9 text-xs cursor-pointer"
                />
              </div>
            </div>

            {/* Live Data Preview */}
            {importData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-foreground">
                    Preview Data ({importData.length} baris tim ditemukan)
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Siap Diimpor
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs">
                  {importData.slice(0, 50).map((row, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between hover:bg-muted/20">
                      <div>
                        <span className="font-bold text-foreground">{row.name || row.TeamName || row.nama || 'Tanpa Nama'}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">
                          (Event: {row.event_name || row.event || 'Default'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary">{row.invite_code || row.kode || 'Auto Code'}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{row.score || 0} PTS</span>
                      </div>
                    </div>
                  ))}
                  {importData.length > 50 && (
                    <div className="p-2 text-center text-muted-foreground text-[10px]">
                      ... dan {importData.length - 50} baris lainnya
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)}>Batal</Button>
            <Button 
              disabled={importLoading || importData.length === 0} 
              onClick={handleProcessSquadImport}
              className="gap-1.5"
            >
              {importLoading ? 'Memproses Import...' : `Impor ${importData.length} Tim`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


