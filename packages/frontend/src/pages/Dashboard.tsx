import React, { useEffect, useState } from 'react';
import { Shield, Globe, Lock, Cpu, Terminal, FileCode, Search, Trophy } from 'lucide-react';
import { ChallengeCard } from '@/components/ChallengeCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';


export const Dashboard: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetchChallenges = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const endpoint = user?.role === 'ADMIN' ? '/admin/challenges' : '/challenges';
      
      const res = await api.get(endpoint);
      setChallenges(res.data);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const filtered = challenges.filter((c) => {
    const matchTab = activeTab === 'ALL' || c.category === activeTab;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
                        c.description.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalPoints = challenges.reduce((acc, c) => acc + c.points, 0);
  const solvedCount = challenges.filter((c) => c.is_solved_by_me).length;

  const dynamicCategories = ['ALL', ...Array.from(new Set(challenges.map(c => c.category)))].sort();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Banner */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <Badge variant="default" className="mb-2">RISERANGER 2 OFFICIAL ARENA</Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              CAPTURE THE FLAG
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl text-sm">
              Infiltrate vulnerable targets, decipher encrypted transmissions, and reverse-engineer binaries to acquire flags. Submit flags to elevate your squad's rank.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border shrink-0">
            <div className="text-center px-3 border-r">
              <div className="text-2xl font-bold text-foreground">{solvedCount} / {challenges.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Solved</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-bold text-foreground">{totalPoints}</div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Total Arena PTS</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls: Search & Category Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="overflow-x-auto cyber-scrollbar-x -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          <Tabs defaultValue="ALL" onValueChange={setActiveTab} className="w-auto">
            <TabsList className="w-max">
              {dynamicCategories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
                  {cat === 'ALL' ? 'ALL CHALLENGES' : cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search challenges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-lg bg-card border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border bg-card">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-bold text-foreground">No challenges found</h3>
          <p className="text-sm text-muted-foreground">Try selecting a different category or clearing your search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((c) => (
            <ChallengeCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
};
