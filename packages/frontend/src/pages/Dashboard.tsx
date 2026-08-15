import React, { useEffect, useState } from 'react';
import { Shield, Globe, Lock, Cpu, Terminal, FileCode, Search, Trophy, Key, Sparkles, Users, UserCheck } from 'lucide-react';
import { ChallengeCard } from '@/components/ChallengeCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import api from '@/services/api';

export const Dashboard: React.FC = () => {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<any>(null);
  const [eventInfo, setEventInfo] = useState<any>(null);
  const [requireToken, setRequireToken] = useState(false);
  const [requireTeam, setRequireTeam] = useState(false);
  const [requireMinMembers, setRequireMinMembers] = useState<{ min: number; current: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  const fetchDashboardData = async () => {
    try {
      const [chalRes, meRes] = await Promise.allSettled([
        api.get('/challenges'),
        api.get('/auth/me')
      ]);

      if (chalRes.status === 'fulfilled') {
        setChallenges(chalRes.value.data);
        setRequireTeam(false);
        setRequireToken(false);
        setRequireMinMembers(null);
      } else if (chalRes.status === 'rejected') {
        const errorData = chalRes.reason?.response?.data;
        if (errorData?.require_token) {
          setRequireToken(true);
        }
        if (errorData?.require_team) {
          setRequireTeam(true);
        }
        if (errorData?.require_min_members) {
          setRequireMinMembers({
            min: errorData.min_team_size,
            current: errorData.current_team_size
          });
        }
      }

      if (meRes.status === 'fulfilled') {
        setTeamInfo(meRes.value.data.team);
        setEventInfo(meRes.value.data.event || meRes.value.data.team?.event);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
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
      {/* Require Token Notice if unverified */}
      {requireToken && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Verifikasi Token Akses Diperlukan</h3>
              <p className="text-xs text-muted-foreground">
                Anda perlu menukarkan Access Token untuk memverifikasi kategori peserta dan membuka daftar tantangan arena Anda.
              </p>
            </div>
          </div>
          <Link to="/join">
            <Button className="gap-2">
              <Key className="h-4 w-4" /> Masukkan Access Token
            </Button>
          </Link>
        </div>
      )}

      {/* Require Team Notice if event is team based and user is solo */}
      {requireTeam && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Wajib Bergabung ke Tim (Squad Required)</h3>
              <p className="text-xs text-muted-foreground">
                Arena ini menggunakan format kompetisi berbasis Tim (Group). Anda belum berada di dalam tim atau baru saja keluar. Silakan buat atau gabung ke tim untuk mengakses soal.
              </p>
            </div>
          </div>
          <Link to="/team">
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Users className="h-4 w-4" /> Buka Menu Squad & Tim
            </Button>
          </Link>
        </div>
      )}

      {/* Require Min Members Notice if squad size is less than minimum required */}
      {requireMinMembers && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground">Syarat Minimal Anggota Belum Terpenuhi</h3>
                <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs font-mono">
                  {requireMinMembers.current} / {requireMinMembers.min} Anggota
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Event ini mewajibkan minimal <strong>{requireMinMembers.min} anggota</strong> per squad untuk membuka soal. Undang rekan tim Anda dengan Invite Code tim di menu Squad!
              </p>
            </div>
          </div>
          <Link to="/team">
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
              <Users className="h-4 w-4" /> Kelola Anggota Tim
            </Button>
          </Link>
        </div>
      )}


      {/* Banner */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="default" className="font-outfit uppercase">
                {eventInfo?.name ? eventInfo.name : 'RISERANGER 2 OFFICIAL ARENA'}
              </Badge>
              {teamInfo && (
                <Badge variant="outline" className="text-primary border-primary/30 font-mono">
                  Squad: {teamInfo.name}
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase font-outfit">
              CAPTURE THE FLAG
            </h1>
            <p className="mt-2 text-muted-foreground max-w-2xl text-sm">
              Infiltrate vulnerable targets, decipher encrypted transmissions, and reverse-engineer binaries to acquire flags. Submit flags to elevate your squad's rank.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border shrink-0">
            {teamInfo && (
              <div className="text-center px-3 border-r">
                <div className="text-2xl font-bold text-primary font-mono">{teamInfo.score}</div>
                <div className="text-xs text-muted-foreground uppercase font-medium">Team Score</div>
              </div>
            )}
            <div className="text-center px-3 border-r">
              <div className="text-2xl font-bold text-foreground">{solvedCount} / {challenges.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Solved</div>
            </div>
            <div className="text-center px-3">
              <div className="text-2xl font-bold text-foreground">{totalPoints}</div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Arena Points</div>
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
          <p className="text-sm text-muted-foreground">
            {requireTeam 
              ? 'Silakan buat atau bergabung dengan Squad terlebih dahulu untuk membuka soal tantangan.'
              : eventInfo?.name 
                ? `Belum ada tantangan aktif di arena "${eventInfo.name}". Silakan tunggu instruksi panitia.`
                : 'Try selecting a different category or clearing your search query.'}
          </p>
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
