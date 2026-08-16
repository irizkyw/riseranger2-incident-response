import React, { useEffect, useState, useRef } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Award,
  Lock,
  UserCheck,
  Search,
  CheckCircle2,
  RefreshCw,
  Edit,
  Eye,
  Key,
  Layers,
  Sparkles,
  ArrowRight,
  Shield,
  Activity,
  Plus,
  Trash2,
  Save,
  CheckSquare,
  Square,
  HelpCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

interface RoleDefinition {
  id: string;
  name: string;
  display_name: string;
  description: string;
  badge_color: string;
  is_system: boolean;
  userCount: number;
  permissions: string[];
}

const AVAILABLE_PERMISSIONS = [
  'Full HQ Command Access',
  'Arena & Live Radar Control (Pause/Stop)',
  'Challenge CRUD & Flag Management',
  'Access Token Generation & Revocation',
  'Writeup Evaluation & Scoring',
  'Writeup Document Viewer & Inline Reader',
  'Score & Feedback Grading Form',
  'Live Radar Activity Monitor',
  'Inspect Operatives & Squad Roster',
  'View Real-Time Submissions Log',
  'Arena Dashboard & Challenge Solver',
  'Team Formation & Invite Code Sharing',
  'Flag Submission (Hit The Flag)',
  'Writeup Upload & Viewer',
  'Scoreboard Timeline Inspection'
];

const isPermMatching = (permList: string[], targetPerm: string): boolean => {
  if (!permList || !Array.isArray(permList)) return false;
  if (permList.includes('*') || permList.includes('all') || permList.includes('ALL')) return true;
  if (permList.includes(targetPerm)) return true;

  const tLower = targetPerm.toLowerCase();
  return permList.some((p) => {
    const pLower = p.toLowerCase();
    return (
      pLower === tLower ||
      tLower.includes(pLower) ||
      pLower.includes(tLower) ||
      (pLower === 'view_challenges' && tLower.includes('challenge')) ||
      (pLower === 'evaluate_writeups' && tLower.includes('writeup')) ||
      (pLower === 'view_scoreboard' && tLower.includes('scoreboard')) ||
      (pLower === 'manage_teams' && (tLower.includes('squad') || tLower.includes('team'))) ||
      (pLower === 'view_activity' && tLower.includes('radar')) ||
      (pLower === 'view_logs' && tLower.includes('submission'))
    );
  });
};

const COLOR_PRESETS = [
  { label: 'Cyan Glow', value: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { label: 'Amber Alert', value: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { label: 'Emerald Mint', value: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { label: 'Purple Nebula', value: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  { label: 'Rose Crimson', value: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { label: 'Blue Sapphire', value: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { label: 'Indigo Royal', value: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' }
];

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [roleSearch, setRoleSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'matrix' | 'roles'>('matrix');
  const [roleViewMode, setRoleViewMode] = useState<'grid' | 'table'>('table');

  const [currentUser] = useState<any>(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });
  
  const getRoleRank = (roleName: string): number => {
    if (!roleName) return 0;
    const normalized = roleName.toUpperCase().trim();
    switch (normalized) {
      case 'SUPERADMIN':
      case 'ADMIN':
      case 'HQ':
        return 100;
      case 'WADMIN':
        return 80;
      case 'MODERATOR':
        return 50;
      case 'JURY':
        return 40;
      case 'PARTICIPANT':
        return 10;
      default:
        return 20;
    }
  };

  const callerRole = (currentUser?.role || 'PARTICIPANT').toUpperCase();
  const callerRank = getRoleRank(callerRole);

  // Change Role Modal State
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<string>('PARTICIPANT');
  const [changingLoading, setChangingLoading] = useState(false);

  // Create Role Modal State
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState({
    name: '',
    display_name: '',
    description: '',
    badge_color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    permissions: ['Arena Dashboard & Challenge Solver', 'Flag Submission (Hit The Flag)']
  });
  const [createRoleLoading, setCreateRoleLoading] = useState(false);

  // Edit Role Modal State
  const [editRoleModal, setEditRoleModal] = useState<RoleDefinition | null>(null);
  const [editRoleForm, setEditRoleForm] = useState({
    display_name: '',
    description: '',
    badge_color: '',
    permissions: [] as string[]
  });
  const [editRoleLoading, setEditRoleLoading] = useState(false);

  // Delete Role Modal State
  const [deleteRoleModal, setDeleteRoleModal] = useState<RoleDefinition | null>(null);
  const [deleteRoleLoading, setDeleteRoleLoading] = useState(false);

  // View Role Details Modal
  const [inspectRole, setInspectRole] = useState<RoleDefinition | null>(null);

  // Pagination for User Matrix
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Horizontal scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.get('/admin/roles'),
        api.get('/admin/users')
      ]);
      setRoles(rolesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load roles and users:', err);
      toast.error('Gagal memuat data roles dan pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenChangeRole = (user: any) => {
    setRoleModalUser(user);
    setTargetRole(user.role || 'PARTICIPANT');
  };

  const handleConfirmChangeRole = async () => {
    if (!roleModalUser) return;
    setChangingLoading(true);
    try {
      await api.put(`/admin/users/${roleModalUser.id}/role`, {
        role: targetRole
      });
      toast.success(`Role user @${roleModalUser.username} berhasil diubah menjadi ${targetRole}!`);
      setRoleModalUser(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengubah role pengguna.');
    } finally {
      setChangingLoading(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createRoleForm.name || !createRoleForm.display_name) {
      toast.error('Kode role dan nama tampilan wajib diisi.');
      return;
    }

    setCreateRoleLoading(true);
    try {
      const res = await api.post('/admin/roles', createRoleForm);
      toast.success(res.data.message || 'Role baru berhasil dibuat!');
      setCreateRoleOpen(false);
      setCreateRoleForm({
        name: '',
        display_name: '',
        description: '',
        badge_color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        permissions: ['Arena Dashboard & Challenge Solver', 'Flag Submission (Hit The Flag)']
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal membuat role baru.');
    } finally {
      setCreateRoleLoading(false);
    }
  };

  const handleOpenEditRole = (role: RoleDefinition) => {
    setEditRoleModal(role);
    const rawPerms = Array.isArray(role.permissions) ? role.permissions : [];

    let initialPerms: string[];
    if (rawPerms.includes('*') || rawPerms.includes('ALL') || role.name === 'ADMIN' || role.name === 'WADMIN') {
      initialPerms = [...AVAILABLE_PERMISSIONS];
    } else {
      const matched = AVAILABLE_PERMISSIONS.filter((p) => isPermMatching(rawPerms, p));
      initialPerms = matched.length > 0 ? matched : rawPerms;
    }

    setEditRoleForm({
      display_name: role.display_name || role.name,
      description: role.description || '',
      badge_color: role.badge_color || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      permissions: initialPerms
    });
  };

  const handleSaveEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoleModal) return;

    setEditRoleLoading(true);
    try {
      const res = await api.put(`/admin/roles/${editRoleModal.id}`, editRoleForm);
      toast.success(res.data.message || 'Role berhasil diperbarui!');
      setEditRoleModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memperbarui role.');
    } finally {
      setEditRoleLoading(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteRoleModal) return;
    setDeleteRoleLoading(true);
    try {
      const res = await api.delete(`/admin/roles/${deleteRoleModal.id}`);
      toast.success(res.data.message || 'Role berhasil dihapus.');
      setDeleteRoleModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus role.');
    } finally {
      setDeleteRoleLoading(false);
    }
  };

  const togglePermission = (perm: string, isEdit: boolean) => {
    if (isEdit) {
      const current = editRoleForm.permissions;
      const exists = current.includes(perm);
      setEditRoleForm({
        ...editRoleForm,
        permissions: exists ? current.filter((p) => p !== perm) : [...current, perm]
      });
    } else {
      const current = createRoleForm.permissions;
      const exists = current.includes(perm);
      setCreateRoleForm({
        ...createRoleForm,
        permissions: exists ? current.filter((p) => p !== perm) : [...current, perm]
      });
    }
  };

  const handleSelectAllPerms = (isEdit: boolean) => {
    if (isEdit) {
      setEditRoleForm({ ...editRoleForm, permissions: [...AVAILABLE_PERMISSIONS] });
    } else {
      setCreateRoleForm({ ...createRoleForm, permissions: [...AVAILABLE_PERMISSIONS] });
    }
  };

  const handleClearAllPerms = (isEdit: boolean) => {
    if (isEdit) {
      setEditRoleForm({ ...editRoleForm, permissions: [] });
    } else {
      setCreateRoleForm({ ...createRoleForm, permissions: [] });
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesQuery =
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.team_member?.team?.name && u.team_member.team.name.toLowerCase().includes(q));

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesQuery && matchesRole;
  });

  const filteredMasterRoles = roles.filter((r) => {
    const q = roleSearch.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.display_name.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return <ShieldAlert className="h-4 w-4 text-amber-400" />;
      case 'JURY':
        return <Award className="h-4 w-4 text-emerald-400" />;
      case 'MODERATOR':
        return <ShieldCheck className="h-4 w-4 text-purple-400" />;
      default:
        return <UserCheck className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 border border-primary/30 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit flex items-center gap-2">
              Roles & Permissions Management
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {roles.length} Roles Active
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Kelola master role sistem & kustom, pembagian hak akses, serta penugasan operasional pengguna.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setCreateRoleOpen(true)}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9"
          >
            <Plus className="h-4 w-4" />
            Tambah Role Baru
          </Button>

          <Button variant="outline" onClick={fetchData} className="gap-2 text-xs h-9">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* TABS CONTROLLER */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <TabsList className="bg-muted/50 p-1 border border-border">
            <TabsTrigger value="matrix" className="gap-2 text-xs font-bold font-outfit uppercase">
              <Users className="h-3.5 w-3.5" />
              Matriks Penugasan Pengguna ({users.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2 text-xs font-bold font-outfit uppercase">
              <Shield className="h-3.5 w-3.5" />
              Master Roles & Konfigurasi ({roles.length})
            </TabsTrigger>
          </TabsList>

          {activeTab === 'roles' && (
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border self-start sm:self-auto">
              <Button
                variant={roleViewMode === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleViewMode('table')}
                className="h-7 text-xs gap-1.5 px-2.5 font-medium"
              >
                <List className="h-3.5 w-3.5" />
                Tabel Master
              </Button>
              <Button
                variant={roleViewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setRoleViewMode('grid')}
                className="h-7 text-xs gap-1.5 px-2.5 font-medium"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid Cards
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: OPERATIVES USER MATRIX */}
        <TabsContent value="matrix" className="space-y-5 m-0">
          {/* Horizontal Smooth Role Carousel Slider */}
          <div className="relative group">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 font-mono">
                <Filter className="h-3.5 w-3.5 text-primary" /> Filter Cepat Berdasarkan Role:
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollLeft}
                  className="h-7 w-7 rounded-full border-border/80 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={scrollRight}
                  className="h-7 w-7 rounded-full border-border/80 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scroll-smooth"
            >
              <div
                onClick={() => {
                  setSelectedRoleFilter('ALL');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl border shrink-0 cursor-pointer transition-all duration-150 flex items-center gap-2.5 ${
                  selectedRoleFilter === 'ALL'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                    : 'border-border bg-card hover:bg-muted/30'
                }`}
              >
                <div className="p-1 rounded-md bg-muted/60">
                  <Users className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Semua Pengguna</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{users.length} Operatives</div>
                </div>
              </div>

              {roles.map((r) => {
                const active = selectedRoleFilter === r.name;
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      setSelectedRoleFilter(active ? 'ALL' : r.name);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-2 rounded-xl border shrink-0 cursor-pointer transition-all duration-150 flex items-center gap-2.5 ${
                      active
                        ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-sm'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="p-1 rounded-md bg-muted/60">
                      {getRoleIcon(r.name)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        {r.name}
                        {!r.is_system && (
                          <span className="text-[8px] bg-primary/15 text-primary px-1 rounded font-mono">Custom</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {r.userCount} Akun {active ? '✓' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Matrix Table Card */}
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground uppercase font-outfit flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Matriks Penugasan Role Pengguna ({filteredUsers.length})
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Daftar akun dan pengalihan hak akses role secara instan.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari username, email, tim..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="pl-8 bg-background h-8 text-xs"
                    />
                  </div>

                  {selectedRoleFilter !== 'ALL' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRoleFilter('ALL')}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Reset Filter ({selectedRoleFilter})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border">
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Pengguna / Operative</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Email</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Squad / Tim</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Role Saat Ini</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground">Tipe Role</TableHead>
                    <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Aksi Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="border-border">
                        <TableCell colSpan={6} className="h-12 text-center">
                          <div className="h-4 bg-muted/40 rounded animate-pulse w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Users className="mx-auto h-8 w-8 mb-2 opacity-40" />
                        <p className="text-sm font-semibold">Tidak ada pengguna yang cocok dengan filter ({selectedRoleFilter}).</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => {
                      const roleObj = roles.find((r) => r.name === user.role);
                      const roleBadge = roleObj?.badge_color || 'text-muted-foreground bg-muted border-border';
                      return (
                        <TableRow key={user.id} className="border-border hover:bg-muted/20">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-7 w-7 ring-1 ring-border">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="font-bold text-foreground text-xs block">@{user.username}</span>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Bergabung {new Date(user.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {user.email}
                          </TableCell>

                          <TableCell>
                            {user.team_member?.team ? (
                              <Badge variant="outline" className="text-[10px] font-mono border-border">
                                <span
                                  className="h-1.5 w-1.5 rounded-full mr-1"
                                  style={{ backgroundColor: user.team_member.team.color || '#00F0FF' }}
                                />
                                {user.team_member.team.name}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">Tanpa Tim</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className={`font-mono text-[10px] font-bold ${roleBadge}`}>
                              {user.role}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground">
                            {roleObj?.is_system ? (
                              <span className="text-muted-foreground font-mono text-[11px]">System Default</span>
                            ) : (
                              <span className="text-primary font-mono text-[11px] font-bold">Custom Defined</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            {callerRank < 100 && getRoleRank(user.role) >= callerRank && user.id !== currentUser?.id ? (
                              <Badge 
                                variant="outline" 
                                className="text-[10px] bg-rose-500/10 text-rose-400 border-rose-500/30 font-mono py-0.5 px-2 flex items-center gap-1 shadow-sm cursor-not-allowed justify-end ml-auto w-fit" 
                                title={`Role ${user.role} (Level ${getRoleRank(user.role)}) berhierarki setara atau lebih tinggi dari Anda (Level ${callerRank}). Tindakan ubah role dilindungi.`}
                              >
                                <Shield className="h-3 w-3" />
                                <span>{getRoleRank(user.role) >= 100 ? 'SUPERADMIN' : 'PROTECTED'}</span>
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenChangeRole(user)}
                                className="h-7 text-xs gap-1.5 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 font-medium"
                              >
                                <Edit className="h-3 w-3" />
                                Ubah Role
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

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
        </TabsContent>

        {/* TAB 2: MASTER ROLES & CONFIGURATION */}
        <TabsContent value="roles" className="space-y-4 m-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari kode role, nama, deskripsi..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="pl-8 bg-background h-8 text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              Menampilkan {filteredMasterRoles.length} dari {roles.length} role
            </p>
          </div>

          {roleViewMode === 'table' ? (
            /* Master Roles Table View */
            <Card className="bg-card border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="border-border">
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">Kode & Icon</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">Nama Tampilan</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">Tipe</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">Anggota</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground">Hak Akses Fitur</TableHead>
                      <TableHead className="text-xs uppercase font-bold text-muted-foreground text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMasterRoles.map((role) => (
                      <TableRow key={role.id} className="border-border hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-muted/60 border border-border">
                              {getRoleIcon(role.name)}
                            </div>
                            <div>
                              <Badge variant="outline" className={`font-mono text-xs font-bold ${role.badge_color}`}>
                                {role.name}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="font-bold text-foreground text-xs block">{role.display_name}</span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {role.description || 'Tidak ada deskripsi.'}
                          </span>
                        </TableCell>

                        <TableCell>
                          {role.is_system ? (
                            <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">
                              System Default
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary bg-primary/10">
                              Custom Role
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="font-mono text-xs font-bold text-foreground">
                          {role.userCount} Operatives
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap max-w-xs">
                            {(role.permissions || []).slice(0, 2).map((p, pIdx) => (
                              <span key={pIdx} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-foreground/80 font-medium truncate max-w-[140px]">
                                {p}
                              </span>
                            ))}
                            {(role.permissions?.length || 0) > 2 && (
                              <span className="text-[10px] text-primary font-mono font-bold">
                                +{role.permissions.length - 2}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setInspectRole(role)}
                              className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                              title="Lihat Rincian Hak Akses"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditRole(role)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              title="Edit Role & Permissions"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            {!role.is_system && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteRoleModal(role)}
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                title="Hapus Role"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            /* Master Roles Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMasterRoles.map((role) => (
                <Card key={role.id} className="bg-card border-border hover:border-primary/40 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-lg bg-muted/40 border border-border">
                        {getRoleIcon(role.name)}
                      </div>
                      <Badge variant="outline" className={`font-mono text-xs font-bold ${role.badge_color}`}>
                        {role.userCount} Operatives
                      </Badge>
                    </div>

                    <div className="mt-2.5">
                      <CardTitle className="text-base font-bold text-foreground font-outfit uppercase flex items-center justify-between">
                        <span>{role.name}</span>
                        {!role.is_system && (
                          <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-mono">
                            Custom
                          </span>
                        )}
                      </CardTitle>
                      <div className="text-[11px] font-semibold text-primary truncate mt-0.5">
                        {role.display_name}
                      </div>
                      <CardDescription className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {role.description || 'Tidak ada deskripsi.'}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-3">
                    <div className="border-t border-border/60 pt-2.5 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Hak Akses ({role.permissions?.length || 0}):
                      </p>
                      <div className="space-y-1">
                        {(role.permissions || []).slice(0, 2).map((perm, pIdx) => (
                          <div key={pIdx} className="text-[11px] text-foreground/85 flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{perm}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-border/40 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInspectRole(role)}
                        className="h-7 text-xs text-primary px-2 font-mono hover:bg-primary/10"
                      >
                        Lihat Detail →
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditRole(role)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Edit Role & Permissions"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>

                        {!role.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRoleModal(role)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            title="Hapus Role Kustom"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* CREATE NEW ROLE MODAL */}
      <Dialog open={createRoleOpen} onOpenChange={setCreateRoleOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <Plus className="h-5 w-5 text-primary" />
              Buat Role Kustom Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tentukan kode unik role, nama tampilan, warna badge, dan izin hak akses fitur platform.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Kode Role (Identifier)</label>
                <Input
                  placeholder="misal: VIP_GUEST"
                  value={createRoleForm.name}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, name: e.target.value })}
                  required
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Nama Tampilan</label>
                <Input
                  placeholder="misal: VIP Guest & Observer"
                  value={createRoleForm.display_name}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, display_name: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-foreground">Deskripsi Wewenang Role</label>
              <Textarea
                placeholder="misal: Akses peninjauan skor dan observasi tantangan tanpa hak submit flag..."
                value={createRoleForm.description}
                onChange={(e) => setCreateRoleForm({ ...createRoleForm, description: e.target.value })}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-foreground">Warna Badge Tampilan</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_PRESETS.map((col, idx) => (
                  <div
                    key={idx}
                    onClick={() => setCreateRoleForm({ ...createRoleForm, badge_color: col.value })}
                    className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                      createRoleForm.badge_color === col.value
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <Badge variant="outline" className={`text-[10px] font-mono font-bold ${col.value}`}>
                      {col.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold uppercase text-foreground block">Hak Akses & Fitur (Permissions)</label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {createRoleForm.permissions.length} dari {AVAILABLE_PERMISSIONS.length} hak akses dipilih
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllPerms(false)}
                    className="h-6 text-[10px] px-2 text-primary hover:text-primary font-medium"
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleClearAllPerms(false)}
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive font-medium"
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-border rounded-lg bg-muted/20">
                {AVAILABLE_PERMISSIONS.map((perm, pIdx) => {
                  const checked = createRoleForm.permissions.includes(perm);
                  return (
                    <div
                      key={pIdx}
                      onClick={() => togglePermission(perm, false)}
                      className={`p-2 rounded-md border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                        checked ? 'border-primary/50 bg-primary/10 text-foreground font-semibold shadow-xs' : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                      }`}
                    >
                      {checked ? (
                        <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-[11px] leading-tight">{perm}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setCreateRoleOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createRoleLoading} className="gap-2 font-bold bg-primary text-primary-foreground">
                <Plus className="h-4 w-4" />
                {createRoleLoading ? 'Membuat Role...' : 'Simpan & Buat Role'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ROLE MODAL */}
      <Dialog open={Boolean(editRoleModal)} onOpenChange={(open) => !open && setEditRoleModal(null)}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <Edit className="h-5 w-5 text-primary" />
              Edit Role & Hak Akses
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Perbarui nama tampilan, deskripsi, warna badge, atau konfigurasi izin hak akses untuk role ini.
            </DialogDescription>
          </DialogHeader>

          {editRoleModal && (
            <form onSubmit={handleSaveEditRole} className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Kode Identifier:</span>
                  <span className="font-mono font-bold text-foreground text-sm">{editRoleModal.name}</span>
                </div>
                <Badge variant="outline" className={`font-mono text-xs font-bold ${editRoleForm.badge_color}`}>
                  {editRoleModal.userCount} Operatives
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Nama Tampilan Role</label>
                <Input
                  value={editRoleForm.display_name}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, display_name: e.target.value })}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-foreground">Deskripsi Wewenang</label>
                <Textarea
                  value={editRoleForm.description}
                  onChange={(e) => setEditRoleForm({ ...editRoleForm, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-foreground">Warna Badge</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {COLOR_PRESETS.map((col, idx) => (
                    <div
                      key={idx}
                      onClick={() => setEditRoleForm({ ...editRoleForm, badge_color: col.value })}
                      className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                        editRoleForm.badge_color === col.value
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <Badge variant="outline" className={`text-[10px] font-mono font-bold ${col.value}`}>
                        {col.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase text-foreground block">Hak Akses & Fitur (Permissions)</label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {editRoleForm.permissions.length} dari {AVAILABLE_PERMISSIONS.length} hak akses aktif
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSelectAllPerms(true)}
                      className="h-6 text-[10px] px-2 text-primary hover:text-primary font-medium"
                    >
                      Pilih Semua
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearAllPerms(true)}
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive font-medium"
                    >
                      Kosongkan
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-border rounded-lg bg-muted/20">
                  {AVAILABLE_PERMISSIONS.map((perm, pIdx) => {
                    const checked = editRoleForm.permissions.includes(perm);
                    return (
                      <div
                        key={pIdx}
                        onClick={() => togglePermission(perm, true)}
                        className={`p-2 rounded-md border text-xs flex items-center gap-2 cursor-pointer transition-all ${
                          checked ? 'border-primary/50 bg-primary/10 text-foreground font-semibold shadow-xs' : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-[11px] leading-tight">{perm}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditRoleModal(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={editRoleLoading} className="gap-2 font-bold bg-primary text-primary-foreground">
                  <Save className="h-4 w-4" />
                  {editRoleLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* INSPECT ROLE DETAIL MODAL */}
      <Dialog open={Boolean(inspectRole)} onOpenChange={(open) => !open && setInspectRole(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <Eye className="h-5 w-5 text-primary" />
              Detail Wewenang Role
            </DialogTitle>
          </DialogHeader>

          {inspectRole && (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border">
                <div>
                  <h4 className="font-bold text-foreground text-sm font-mono">{inspectRole.name}</h4>
                  <p className="text-xs text-primary font-semibold">{inspectRole.display_name}</p>
                </div>
                <Badge variant="outline" className={`font-mono text-xs font-bold ${inspectRole.badge_color}`}>
                  {inspectRole.userCount} Akun
                </Badge>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deskripsi:</span>
                <p className="text-xs text-foreground bg-muted/20 p-2.5 rounded-lg border border-border">
                  {inspectRole.description || 'Tidak ada deskripsi tambahan.'}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Daftar Hak Akses ({inspectRole.permissions?.length || 0}):
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(inspectRole.permissions || []).map((perm, idx) => (
                    <div key={idx} className="p-2 rounded bg-muted/30 border border-border flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-foreground">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInspectRole(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE ROLE MODAL */}
      <Dialog open={Boolean(deleteRoleModal)} onOpenChange={(open) => !open && setDeleteRoleModal(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-outfit uppercase">
              <Trash2 className="h-5 w-5" />
              Hapus Role Kustom
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tindakan ini akan menghapus role secara permanen. Pengguna yang saat ini memiliki role ini akan otomatis dialihkan ke role <strong>PARTICIPANT</strong>.
            </DialogDescription>
          </DialogHeader>

          {deleteRoleModal && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 space-y-1 text-xs">
              <p className="font-bold text-destructive">Role yang akan dihapus:</p>
              <p className="font-mono text-foreground font-bold">{deleteRoleModal.name} - {deleteRoleModal.display_name}</p>
              <p className="text-muted-foreground">Total pengguna terdampak: {deleteRoleModal.userCount} akun</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteRoleModal(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRole}
              disabled={deleteRoleLoading}
              className="gap-2 font-bold"
            >
              <Trash2 className="h-4 w-4" />
              {deleteRoleLoading ? 'Menghapus...' : 'Konfirmasi Hapus Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CHANGE USER ROLE MODAL */}
      <Dialog open={Boolean(roleModalUser)} onOpenChange={(open) => !open && setRoleModalUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground font-outfit uppercase">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Ubah Hak Akses Role Pengguna
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pilih tingkatan role dan wewenang operasional untuk akun ini.
            </DialogDescription>
          </DialogHeader>

          {roleModalUser && (
            <div className="space-y-4 py-2">
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Akun Target:</span>
                  <span className="font-bold text-foreground text-sm">@{roleModalUser.username}</span>
                  <span className="text-muted-foreground block font-mono text-[11px]">{roleModalUser.email}</span>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  Saat Ini: {roleModalUser.role}
                </Badge>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-foreground">Pilih Role:</label>
                <div className="grid grid-cols-1 gap-2">
                  {roles
                    .filter((r) => callerRank >= 100 || getRoleRank(r.name) < callerRank)
                    .map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setTargetRole(r.name)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                        targetRole === r.name
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          {getRoleIcon(r.name)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase flex items-center gap-2">
                            {r.name}
                            <span className="text-[10px] text-muted-foreground font-normal">({r.display_name})</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</div>
                        </div>
                      </div>
                      {targetRole === r.name && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRoleModalUser(null)} disabled={changingLoading}>
              Batal
            </Button>
            <Button
              onClick={handleConfirmChangeRole}
              disabled={changingLoading}
              className="gap-2 font-bold bg-primary text-primary-foreground"
            >
              <CheckCircle2 className="h-4 w-4" />
              {changingLoading ? 'Menyimpan...' : 'Terapkan Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
