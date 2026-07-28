import React, { useEffect, useState } from 'react';
import { Users, Search } from 'lucide-react';
import { TeamList } from '@/components/admin/TeamList';
import { toast } from 'sonner';
import api from '@/services/api';
import { Input } from '@/components/ui/input';

export const AdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTeams = async () => {
    try {
      const res = await api.get('/admin/teams');
      setTeams(res.data);
    } catch (err) {
      toast.error('Failed to load teams data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Teams...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">Team Moderation</h1>
            <p className="text-muted-foreground mt-1">Manage participating teams and moderation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search teams..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      
      <TeamList teams={teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))} onRefresh={fetchTeams} />
    </div>
  );
};
