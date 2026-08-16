import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  Download, 
  RefreshCw, 
  UserCheck, 
  UserPlus, 
  Calendar,
  FileSpreadsheet,
  Upload,
  FileDown,
  Eye,
  History,
  FileText,
  CheckCircle2,
  XCircle,
  Award,
  Key
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';


export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PARTICIPANT' | 'ADMIN' | 'JURY' | 'MODERATOR'>('ALL');
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'IN_TEAM' | 'NO_TEAM'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Create User Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'PARTICIPANT',
    event_id: ''
  });
  const [createLoading, setCreateLoading] = useState(false);

  // Edit User Modal state
  const [editModalUser, setEditModalUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'PARTICIPANT',
    event_id: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Inspect / Delete dialogs
  const [inspectUser, setInspectUser] = useState<any | null>(null);
  const [deleteUser, setDeleteUser] = useState<{ id: string; username: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Import from XLSX / CSV state
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importDefaultRole, setImportDefaultRole] = useState<'PARTICIPANT' | 'ADMIN' | 'JURY' | 'MODERATOR'>('PARTICIPANT');
  const [importDefaultEventId, setImportDefaultEventId] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data || []);
      if (res.data.length > 0 && !importDefaultEventId) {
        setImportDefaultEventId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, []);

  const handleDownloadUserTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const defaultEvName = events[0]?.name || 'CTF Kategori Mahasiswa 2026';
    const sampleRows = [
      { username: 'operative_mhs_1', email: 'mhs1@kampus.ac.id', password: 'password123', role: 'PARTICIPANT', event_name: defaultEvName },
      { username: 'operative_mhs_2', email: 'mhs2@kampus.ac.id', password: 'password123', role: 'PARTICIPANT', event_name: defaultEvName },
      { username: 'operative_umum_1', email: 'pro1@cybersec.id', password: 'password123', role: 'PARTICIPANT', event_name: events[1]?.name || 'CTF Kategori Umum 2026' },
      { username: 'admin_assistant', email: 'assistant@ctf.local', password: 'adminpassword123', role: 'ADMIN', event_name: '' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

    if (format === 'csv') {
      XLSX.writeFile(workbook, 'Template_Import_Users.csv', { bookType: 'csv' });
    } else {
      XLSX.writeFile(workbook, 'Template_Import_Users.xlsx');
    }
    toast.success(`Template User ${format.toUpperCase()} berhasil diunduh.`);
  };

  const handleUserFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        toast.success(`Berhasil membaca ${data.length} data user dari file.`);
      } catch (err) {
        console.error('Error parsing user spreadsheet:', err);
        toast.error('Gagal membaca spreadsheet. Pastikan format .xlsx atau .csv valid.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleProcessUserImport = async () => {
    if (importData.length === 0) {
      toast.error('Tidak ada data user yang akan diimpor.');
      return;
    }

    setImportLoading(true);
    try {
      const res = await api.post('/admin/users/import', {
        users: importData,
        default_role: importDefaultRole,
        default_event_id: importDefaultEventId || undefined
      });

      toast.success(res.data.message || 'Import user berhasil!');
      if (res.data.errors && res.data.errors.length > 0) {
        console.warn('Import warnings:', res.data.errors);
      }
      setImportOpen(false);
      setImportData([]);
      setImportFileName('');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memproses import user.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.username || !createForm.email || !createForm.password) {
      toast.error('Username, email, dan password wajib diisi.');
      return;
    }

    setCreateLoading(true);
    try {
      const res = await api.post('/admin/users', createForm);
      toast.success(res.data.message || 'User baru berhasil dibuat!');
      setCreateModalOpen(false);
      setCreateForm({
        username: '',
        email: '',
        password: '',
        role: 'PARTICIPANT',
        event_id: ''
      });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal membuat user baru.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleOpenEdit = (user: any) => {
    setEditModalUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      event_id: user.event_id || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;

    setEditLoading(true);
    try {
      const res = await api.put(`/admin/users/${editModalUser.id}`, editForm);
      toast.success(res.data.message || 'Data user berhasil diperbarui!');
      setEditModalUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui data user.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User berhasil dihapus dari sistem.');
      setDeleteUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus user.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export');
      return;
    }

    const headers = ['Username', 'Email', 'Role', 'Team', 'Joined At'];
    const rows = filteredUsers.map(u => [
      u.username,
      u.email,
      u.role,
      u.team_member?.team?.name || 'No Team',
      new Date(u.created_at).toLocaleDateString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `riseranger_users_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('User report exported to CSV');
  };

  // Filter computation
  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    const matchesSearch = 
      u.username.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      (u.team_member?.team?.name && u.team_member.team.name.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesTeam = 
      teamFilter === 'ALL' || 
      (teamFilter === 'IN_TEAM' && u.team_member?.team) || 
      (teamFilter === 'NO_TEAM' && !u.team_member?.team);

    return matchesSearch && matchesRole && matchesTeam;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalCount = users.length;
  const participantCount = users.filter(u => u.role === 'PARTICIPANT').length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const juryCount = users.filter(u => u.role === 'JURY').length;
  const moderatorCount = users.filter(u => u.role === 'MODERATOR').length;
  const inTeamCount = users.filter(u => u.team_member?.team).length;

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
              User & Operative Management
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {totalCount} Total
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Kelola akun peserta, penugasan role (Admin, Juri, Moderator, Participant), dan pembuatan user baru.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={() => setCreateModalOpen(true)} 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            <UserPlus className="h-4 w-4" />
            Tambah User
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setImportOpen(true)} 
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import (XLSX)
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Accounts</p>
              <h3 className="text-3xl font-black font-mono text-foreground mt-1">{totalCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-cyan-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan-400 tracking-wider">Participants</p>
              <h3 className="text-3xl font-black font-mono text-cyan-400 mt-1">{participantCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-purple-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-purple-400 tracking-wider">In Squads (Teams)</p>
              <h3 className="text-3xl font-black font-mono text-purple-400 mt-1">{inTeamCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border border-amber-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-amber-400 tracking-wider">Administrators</p>
              <h3 className="text-3xl font-black font-mono text-amber-400 mt-1">{adminCount}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls & Filter Bar */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto flex-1">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username, email, squad..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 bg-background h-9 text-xs"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border">
                {(['ALL', 'PARTICIPANT', 'ADMIN'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRoleFilter(r);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                      roleFilter === r
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Team Affiliation Filter */}
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border">
                {(['ALL', 'IN_TEAM', 'NO_TEAM'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTeamFilter(t);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-colors ${
                      teamFilter === t
                        ? 'bg-secondary text-secondary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'ALL' ? 'All Teams' : t === 'IN_TEAM' ? 'In Squad' : 'Solo'}
                  </button>
                ))}
              </div>
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
                onClick={fetchUsers}
                disabled={loading}
                className="h-9 w-9 border-border"
                title="Reload Users"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-primary' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table Card */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border">
                <TableHead className="text-xs uppercase font-bold text-muted-foreground w-12 text-center">#</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">User Identity</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Role</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Squad (Team)</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Enlisted Date</TableHead>
                <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell colSpan={6} className="h-14 text-center">
                      <div className="h-4 bg-muted/40 rounded animate-pulse w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No operatives found matching the filter.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u, index) => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/20">
                    <TableCell className="text-xs text-muted-foreground font-mono text-center">
                      {(currentPage - 1) * pageSize + index + 1}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {u.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-bold text-foreground text-sm">@{u.username}</span>
                          <span className="block text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          u.role === 'ADMIN' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono text-[10px] font-bold' 
                            : u.role === 'JURY'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px] font-bold'
                              : u.role === 'MODERATOR'
                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/30 font-mono text-[10px] font-bold'
                                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-mono text-[10px] font-bold'
                        }
                      >
                        {u.role}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {u.team_member?.team ? (
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.team_member.team.color || '#00F0FF' }} />
                          {u.team_member.team.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic font-mono">No Squad (Solo)</span>
                      )}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setInspectUser(u)} 
                          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                          title="Lihat Detail & Riwayat Akun"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleOpenEdit(u)} 
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          title="Edit User"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setDeleteUser({ id: u.id, username: u.username })} 
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete User"
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
          totalItems={filteredUsers.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Delete User Modal */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete operative <strong>@{deleteUser?.username}</strong>? This action is permanent and will remove them from any squad and delete all their associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" disabled={actionLoading} onClick={() => deleteUser && handleDelete(deleteUser.id)}>
              {actionLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* IMPORT USERS FROM XLSX / CSV MODAL */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit text-xl">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Import Users from Spreadsheet (XLSX / CSV)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload file Excel (.xlsx / .xls) atau CSV yang memuat daftar pengguna / akun peserta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template Download Buttons */}
            <div className="p-3 bg-muted/40 border border-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Unduh Template Spreadsheet User</p>
                <p className="text-[11px] text-muted-foreground">Kolom: username, email, password, role, event_name</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadUserTemplate('xlsx')}
                  className="gap-1.5 text-xs h-8"
                >
                  <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                  Template .XLSX
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownloadUserTemplate('csv')}
                  className="gap-1.5 text-xs h-8"
                >
                  <FileDown className="h-3.5 w-3.5 text-primary" />
                  Template .CSV
                </Button>
              </div>
            </div>

            {/* Default Role & Event Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Default User Role</label>
                <select
                  value={importDefaultRole}
                  onChange={(e) => setImportDefaultRole(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="PARTICIPANT">PARTICIPANT (Peserta)</option>
                  <option value="ADMIN">ADMIN (Panitia)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Default Target Event Arena</label>
                <select
                  value={importDefaultEventId}
                  onChange={(e) => setImportDefaultEventId(e.target.value)}
                  className="w-full h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Tanpa Event Default --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
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
                <p className="text-[10px] text-muted-foreground mb-3">Maksimum hingga 500 baris user sekaligus.</p>
                <Input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleUserFileChange}
                  className="max-w-xs mx-auto h-9 text-xs cursor-pointer"
                />
              </div>
            </div>

            {/* Live Data Preview */}
            {importData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-foreground">
                    Preview Data ({importData.length} baris user ditemukan)
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    Siap Diimpor
                  </Badge>
                </div>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border text-xs">
                  {importData.slice(0, 50).map((row, idx) => (
                    <div key={idx} className="p-2 flex items-center justify-between hover:bg-muted/20">
                      <div>
                        <span className="font-bold text-foreground">@{row.username || row.Username || 'Tanpa Username'}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">
                          ({row.email || row.Email || 'No Email'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px]">
                          {row.role || row.Role || importDefaultRole}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {row.event_name || row.event || 'Default'}
                        </span>
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
              onClick={handleProcessUserImport}
              className="gap-1.5"
            >
              {importLoading ? 'Memproses Import...' : `Impor ${importData.length} User`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Operative History & Dossier Modal */}
      <Dialog open={Boolean(inspectUser)} onOpenChange={(open) => !open && setInspectUser(null)}>
        <DialogContent className="max-w-3xl bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-primary/40">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {inspectUser?.username?.slice(0, 2).toUpperCase() || 'OP'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-xl font-bold font-outfit uppercase flex items-center gap-2">
                    @{inspectUser?.username}
                    <Badge variant={inspectUser?.role === 'ADMIN' ? 'default' : 'secondary'} className="text-[10px]">
                      {inspectUser?.role}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs font-mono text-muted-foreground">
                    {inspectUser?.email} • Terdaftar sejak {inspectUser?.created_at ? new Date(inspectUser.created_at).toLocaleString() : '-'}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {inspectUser && (
            <Tabs defaultValue="overview" className="space-y-4 pt-2">
              <TabsList className="w-full justify-start bg-muted/60 p-1 border border-border">
                <TabsTrigger value="overview" className="text-xs gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Overview & Afiliasi
                </TabsTrigger>
                <TabsTrigger value="tokens" className="text-xs gap-1.5">
                  <Key className="h-3.5 w-3.5" /> History Token ({inspectUser.used_tokens?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="submissions" className="text-xs gap-1.5">
                  <Award className="h-3.5 w-3.5" /> Submissions Flag ({inspectUser.submissions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="writeups" className="text-xs gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Writeup ({inspectUser.writeups?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Afiliasi Arena Event</div>
                    <div className="text-base font-bold text-foreground">
                      {inspectUser.event?.name || <span className="text-muted-foreground/60 italic font-mono font-normal">Belum Klaim Token Event</span>}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {inspectUser.event_id ? `Event ID: ${inspectUser.event_id}` : 'Status: Unattached (Akses Terkunci)'}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/30 border border-border/80 space-y-2">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Keanggotaan Tim (Squad)</div>
                    <div className="text-base font-bold text-foreground flex items-center gap-2">
                      {inspectUser.team_member?.team ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: inspectUser.team_member.team.color || '#00F0FF' }} />
                          {inspectUser.team_member.team.name}
                        </>
                      ) : (
                        <span className="text-muted-foreground/60 italic font-mono font-normal">No Squad (Solo)</span>
                      )}
                    </div>
                    {inspectUser.team_member?.team && (
                      <div className="text-xs text-muted-foreground font-mono">
                        Skor: <span className="text-primary font-bold">{inspectUser.team_member.team.score} pts</span> • Invite: {inspectUser.team_member.team.invite_code}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-3">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Ringkasan Aktivitas Akun</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-xl font-bold font-mono text-primary">{inspectUser.used_tokens?.length || 0}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-medium">Token Diklaim</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-xl font-bold font-mono text-emerald-400">
                        {inspectUser.submissions?.filter((s: any) => s.is_correct).length || 0}
                      </div>
                      <div className="text-[10px] uppercase text-muted-foreground font-medium">Flag Solved</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-xl font-bold font-mono text-foreground">{inspectUser.submissions?.length || 0}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-medium">Total Submit</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-card border">
                      <div className="text-xl font-bold font-mono text-purple-400">{inspectUser.writeups?.length || 0}</div>
                      <div className="text-[10px] uppercase text-muted-foreground font-medium">Writeup Upload</div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: TOKEN CLAIMS HISTORY */}
              <TabsContent value="tokens" className="space-y-3">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs uppercase">Token Key</TableHead>
                        <TableHead className="text-xs uppercase">Event Arena</TableHead>
                        <TableHead className="text-xs uppercase">Batch / Label</TableHead>
                        <TableHead className="text-xs uppercase text-right">Tanggal Digunakan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!inspectUser.used_tokens || inspectUser.used_tokens.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                            Akun ini belum pernah menukarkan kode tiket / Access Token.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inspectUser.used_tokens.map((tk: any) => (
                          <TableRow key={tk.id} className="border-border">
                            <TableCell>
                              <code className="px-2 py-0.5 rounded bg-muted/60 font-mono text-xs font-bold text-primary">
                                {tk.token}
                              </code>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {tk.event?.name || '-'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {tk.label || '—'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono text-right">
                              {tk.used_at ? new Date(tk.used_at).toLocaleString() : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 3: SUBMISSIONS HISTORY */}
              <TabsContent value="submissions" className="space-y-3">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs uppercase">Soal / Challenge</TableHead>
                        <TableHead className="text-xs uppercase">Kategori</TableHead>
                        <TableHead className="text-xs uppercase">Poin</TableHead>
                        <TableHead className="text-xs uppercase">Status</TableHead>
                        <TableHead className="text-xs uppercase text-right">Waktu Submit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!inspectUser.submissions || inspectUser.submissions.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                            Belum ada riwayat submission flag dari akun ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inspectUser.submissions.map((sub: any) => (
                          <TableRow key={sub.id} className="border-border">
                            <TableCell className="text-xs font-semibold text-foreground">
                              {sub.challenge?.title || 'Unknown Challenge'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {sub.challenge?.category || 'MISC'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-primary">
                              +{sub.challenge?.points || 0} pts
                            </TableCell>
                            <TableCell>
                              {sub.is_correct ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> BENAR (SOLVED)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] gap-1">
                                  <XCircle className="h-3 w-3" /> SALAH (FAILED)
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono text-right">
                              {new Date(sub.submitted_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* TAB 4: WRITEUP DOCS */}
              <TabsContent value="writeups" className="space-y-3">
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-xs uppercase">File Laporan</TableHead>
                        <TableHead className="text-xs uppercase">Event Arena</TableHead>
                        <TableHead className="text-xs uppercase">Nilai Juri</TableHead>
                        <TableHead className="text-xs uppercase text-right">Waktu Upload</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!inspectUser.writeups || inspectUser.writeups.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-xs text-muted-foreground">
                            Belum ada dokumen writeup yang diunggah oleh akun ini.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inspectUser.writeups.map((w: any) => (
                          <TableRow key={w.id} className="border-border">
                            <TableCell className="text-xs font-semibold text-foreground">
                              {w.file_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {w.event?.name || '-'}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-primary">
                              {w.score !== undefined ? `${w.score} pts` : 'Pending'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono text-right">
                              {new Date(w.submitted_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" onClick={() => setInspectUser(null)}>
              Tutup Riwayat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <UserPlus className="h-5 w-5 text-primary" />
              Tambah Operative / User Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Daftarkan akun baru ke platform dengan menentukan role dan akses arena.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-foreground">Username</label>
              <Input
                placeholder="misal: operative_zero"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-foreground">Email</label>
              <Input
                type="email"
                placeholder="misal: user@cybersec.id"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-foreground">Password</label>
              <Input
                type="password"
                placeholder="Minimal 6 karakter"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Role Akses</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs"
                >
                  <option value="PARTICIPANT">PARTICIPANT (Peserta)</option>
                  <option value="JURY">JURY (Dewan Juri)</option>
                  <option value="MODERATOR">MODERATOR (Pengawas)</option>
                  <option value="ADMIN">ADMIN (Super Command)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Target Arena</label>
                <select
                  value={createForm.event_id}
                  onChange={(e) => setCreateForm({ ...createForm, event_id: e.target.value })}
                  className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs"
                >
                  <option value="">-- Tanpa Event --</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createLoading} className="gap-2 font-bold bg-primary text-primary-foreground">
                <UserPlus className="h-4 w-4" />
                {createLoading ? 'Membuat...' : 'Buat User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog Modal */}
      <Dialog open={Boolean(editModalUser)} onOpenChange={(open) => !open && setEditModalUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <Edit className="h-5 w-5 text-primary" />
              Edit Akun Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Perbarui identitas, role, event, atau atur ulang password akun ini.
            </DialogDescription>
          </DialogHeader>

          {editModalUser && (
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Username</label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase text-foreground">Reset Password</label>
                  <span className="text-[10px] text-muted-foreground">(Kosongkan jika tidak diubah)</span>
                </div>
                <Input
                  type="password"
                  placeholder="Ketik password baru untuk mereset..."
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground">Role Akses</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs"
                  >
                    <option value="PARTICIPANT">PARTICIPANT (Peserta)</option>
                    <option value="JURY">JURY (Dewan Juri)</option>
                    <option value="MODERATOR">MODERATOR (Pengawas)</option>
                    <option value="ADMIN">ADMIN (Super Command)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-foreground">Target Arena</label>
                  <select
                    value={editForm.event_id}
                    onChange={(e) => setEditForm({ ...editForm, event_id: e.target.value })}
                    className="w-full h-9 px-2 rounded-md bg-background border border-input text-xs"
                  >
                    <option value="">-- Tanpa Event --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditModalUser(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={editLoading} className="gap-2 font-bold bg-primary text-primary-foreground">
                  <Save className="h-4 w-4" />
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

