import React, { useEffect, useState } from 'react';
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
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  userCount: number;
  permissions: string[];
}

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Change Role Modal State
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<string>('PARTICIPANT');
  const [changingLoading, setChangingLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

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

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesQuery =
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.team_member?.team?.name && u.team_member.team.name.toLowerCase().includes(q));

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesQuery && matchesRole;
  });

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case 'ADMIN':
        return <ShieldAlert className="h-6 w-6 text-amber-400" />;
      case 'JURY':
        return <Award className="h-6 w-6 text-emerald-400" />;
      case 'MODERATOR':
        return <ShieldCheck className="h-6 w-6 text-purple-400" />;
      default:
        return <UserCheck className="h-6 w-6 text-cyan-400" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-6xl">
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
              Kelola hak akses kontrol, pembagian wewenang Dewan Juri, Moderator Pengawas, dan Operative Peserta.
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={fetchData} className="gap-2 self-start sm:self-auto text-xs h-9">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {roles.map((role) => (
          <Card
            key={role.id}
            onClick={() => setSelectedRoleFilter(selectedRoleFilter === role.id ? 'ALL' : role.id)}
            className={`bg-card border transition-all duration-200 cursor-pointer flex flex-col justify-between hover:shadow-lg ${
              selectedRoleFilter === role.id
                ? 'border-primary ring-2 ring-primary/30 shadow-md'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                  {getRoleIcon(role.id)}
                </div>
                <Badge variant="outline" className={`font-mono text-xs font-bold ${role.badgeColor}`}>
                  {role.userCount} Operatives
                </Badge>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-3 font-outfit uppercase">
                {role.id}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                {role.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="border-t border-border/60 pt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Hak Akses & Fitur:
                </p>
                <div className="space-y-1">
                  {role.permissions.map((perm, pIdx) => (
                    <div key={pIdx} className="text-[11px] text-foreground/85 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                      <span className="truncate">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-right">
                <span className="text-[10px] font-mono text-primary flex items-center justify-end gap-1 font-semibold">
                  {selectedRoleFilter === role.id ? 'Sedang Difilter ✓' : 'Klik untuk Filter →'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operative Role Matrix & Assignments Table */}
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
                <TableHead className="text-xs uppercase font-bold text-muted-foreground">Wewenang Utama</TableHead>
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
                    <p className="text-sm font-semibold">Tidak ada pengguna yang cocok dengan kriteria pencarian.</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => {
                  const roleBadge = roles.find((r) => r.id === user.role)?.badgeColor || 'text-muted-foreground bg-muted border-border';
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
                        {user.role === 'ADMIN' ? (
                          <span className="text-amber-400 font-medium">⚡ Super HQ Control</span>
                        ) : user.role === 'JURY' ? (
                          <span className="text-emerald-400 font-medium">📝 Evaluasi & Penilaian Writeup</span>
                        ) : user.role === 'MODERATOR' ? (
                          <span className="text-purple-400 font-medium">👁️ Monitoring & Radar Stream</span>
                        ) : (
                          <span className="text-cyan-400 font-medium">🎯 Tanding Arena & Submit Flag</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenChangeRole(user)}
                          className="h-7 text-xs gap-1.5 bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 font-medium"
                        >
                          <Edit className="h-3 w-3" />
                          Ubah Role
                        </Button>
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

      {/* Change Role Dialog Modal */}
      <Dialog open={Boolean(roleModalUser)} onOpenChange={(open) => !open && setRoleModalUser(null)}>
        <DialogContent className="bg-card border-border sm:max-w-md">
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
                <label className="text-xs font-bold uppercase text-foreground">Pilih Role Baru:</label>
                <div className="grid grid-cols-1 gap-2">
                  {roles.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setTargetRole(r.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                        targetRole === r.id
                          ? 'border-primary bg-primary/10 ring-1 ring-primary'
                          : 'border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-muted/50">
                          {getRoleIcon(r.id)}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-foreground uppercase">{r.id}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</div>
                        </div>
                      </div>
                      {targetRole === r.id && (
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
