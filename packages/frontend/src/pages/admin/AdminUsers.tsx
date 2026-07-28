import React, { useEffect, useState } from 'react';
import { Users, Trash2, Edit, Save, X, Search } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('PARTICIPANT');
  
  const [deleteUser, setDeleteUser] = useState<{ id: string, username: string } | null>(null);

  const fetchUsers = async () => {
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
    try {
      await api.put(`/admin/users/${id}/role`, { role: editRole });
      toast.success('User role updated');
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Users...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage platform users and assign roles</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Joined At</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-bold text-white">{u.username}</TableCell>
              <TableCell className="text-muted-foreground">{u.email}</TableCell>
              <TableCell>
                {editingId === u.id ? (
                  <select 
                    value={editRole} 
                    onChange={(e) => setEditRole(e.target.value)}
                    className="h-8 rounded bg-background border border-border text-xs px-2 focus:border-primary"
                  >
                    <option value="PARTICIPANT">PARTICIPANT</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                ) : (
                  <Badge variant={u.role === 'ADMIN' ? 'destructive' : 'outline'}>{u.role}</Badge>
                )}
              </TableCell>
              <TableCell>
                {u.team_member ? (
                  <Badge variant="secondary">{u.team_member.team.name}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No Team</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {editingId === u.id ? (
                  <>
                    <Button variant="cyber" size="icon" onClick={() => handleUpdateRole(u.id)} className="h-8 w-8">
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="icon" onClick={() => {
                    setEditingId(u.id);
                    setEditRole(u.role);
                  }} className="h-8 w-8 text-primary">
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                
                <Button variant="destructive" size="icon" onClick={() => setDeleteUser({ id: u.id, username: u.username })} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.username}</strong>? This will permanently remove them from the platform and any teams they are part of!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteUser && handleDelete(deleteUser.id)}>Delete User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
