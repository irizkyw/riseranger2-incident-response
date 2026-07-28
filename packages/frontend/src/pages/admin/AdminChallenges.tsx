import React, { useEffect, useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { ChallengeCrud } from '@/components/admin/ChallengeCrud';
import { toast } from 'sonner';
import api from '@/services/api';
import { Input } from '@/components/ui/input';

export const AdminChallenges: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const [chalRes, eventsRes, catRes] = await Promise.all([
        api.get('/admin/challenges'),
        api.get('/admin/events'),
        api.get('/admin/categories')
      ]);
      setChallenges(chalRes.data);
      setEvents(eventsRes.data);
      setCategories(catRes.data);
    } catch (err) {
      toast.error('Failed to load challenges data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Challenges...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">Challenge Management</h1>
            <p className="text-muted-foreground mt-1">Manage and create challenges for the CTF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search challenges..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>
      
      <ChallengeCrud 
        challenges={challenges.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.category.toLowerCase().includes(search.toLowerCase()))} 
        events={events} 
        categories={categories}
        onRefresh={fetchData} 
      />
    </div>
  );
};
