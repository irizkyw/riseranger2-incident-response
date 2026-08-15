import React, { useEffect, useState } from 'react';
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
  Calendar 
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

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'PARTICIPANT' | 'ADMIN'>('ALL');
  const [teamFilter, setTeamFilter] = useState<'ALL' | 'IN_TEAM' | 'NO_TEAM'>('ALL');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Edit / Delete dialogs
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('PARTICIPANT');
  const [deleteUser, setDeleteUser] = useState<{ id: string; username: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    fetchUsers();
  }, []);

  const handleUpdateRole = async (id: string) => {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${id}/role`, { role: editRole });
      toast.success('User role updated successfully');
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
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
      u.created_at ? new Date(u.created_at).toLocaleString() : ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ctf_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Users exported to CSV!');
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
              User Management
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30 font-mono">
                {totalCount} Total
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage platform operatives, inspect squad affiliations, and assign administrative roles.
            </p>
          </div>
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

        <Card className="bg-card border-border border-rose-500/20">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-rose-400 tracking-wider">Administrators</p>
              <h3 className="text-3xl font-black font-mono text-rose-400 mt-1">{adminCount}</h3>
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
          {/* Role Filter */}
          <div className="flex items-center rounded-md border border-input bg-background p-0.5 text-xs">
            <button
              onClick={() => { setRoleFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${roleFilter === 'ALL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All Roles
            </button>
            <button
              onClick={() => { setRoleFilter('PARTICIPANT'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${roleFilter === 'PARTICIPANT' ? 'bg-cyan-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Participants
            </button>
            <button
              onClick={() => { setRoleFilter('ADMIN'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${roleFilter === 'ADMIN' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Admins
            </button>
          </div>

          {/* Team Filter */}
          <select 
            value={teamFilter}
            onChange={(e) => { setTeamFilter(e.target.value as any); setCurrentPage(1); }}
            className="h-9 px-3 rounded-md bg-background border border-input text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Squad Affiliations</option>
            <option value="IN_TEAM">In Squad (Assigned)</option>
            <option value="NO_TEAM">Solo / No Squad</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-60">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search user, email, squad..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-9 text-xs gap-1.5" title="Export to CSV">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>

          <Button variant="ghost" size="icon" onClick={fetchUsers} className="h-9 w-9" title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs uppercase">User Operative</TableHead>
                <TableHead className="text-xs uppercase">Email Address</TableHead>
                <TableHead className="text-xs uppercase">Role</TableHead>
                <TableHead className="text-xs uppercase">Squad / Team</TableHead>
                <TableHead className="text-xs uppercase">Registered</TableHead>
                <TableHead className="text-xs uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm">No users found matching your filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                            {u.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="font-semibold text-sm text-foreground">
                          {u.username}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {u.email}
                    </TableCell>

                    <TableCell>
                      {editingId === u.id ? (
                        <select 
                          value={editRole} 
                          onChange={(e) => setEditRole(e.target.value)}
                          className="h-7 rounded bg-background border border-border text-xs px-2 focus:border-primary font-semibold"
                        >
                          <option value="PARTICIPANT">PARTICIPANT</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <Badge 
                          variant={u.role === 'ADMIN' ? 'destructive' : 'default'}
                          className="text-[10px] font-mono uppercase"
                        >
                          {u.role}
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      {u.team_member?.team ? (
                        <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                          {u.team_member.team.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">No Squad</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingId === u.id ? (
                          <>
                            <Button 
                              variant="default" 
                              size="icon" 
                              onClick={() => handleUpdateRole(u.id)} 
                              disabled={actionLoading}
                              className="h-7 w-7"
                              title="Save Role"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingId(null)} 
                              className="h-7 w-7"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setEditingId(u.id);
                              setEditRole(u.role);
                            }} 
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Edit Role"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
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
    </div>
  );
};
