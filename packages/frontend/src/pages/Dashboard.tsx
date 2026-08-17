import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Shield, Globe, Lock, Cpu, Terminal, FileCode, Search, Trophy, Key, Sparkles, Users, UserCheck, Pause, Play, ShieldAlert, BarChart3, Activity } from 'lucide-react';
import { ChallengeCard } from '@/components/ChallengeCard';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { EventDetailModal } from '@/components/EventDetailModal';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '@/services/api';
import { io, Socket } from 'socket.io-client';

const getCached = (key: string, fallback: any) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

export const Dashboard: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'ALL';

  // Client-side Instant Cache (Stale-While-Revalidate pattern)
  const [challenges, setChallenges] = useState<any[]>(() => getCached('arena_challenges', []));
  const [categories, setCategories] = useState<string[]>(() => getCached('arena_categories', ['ALL']));
  const [teamInfo, setTeamInfo] = useState<any>(() => getCached('arena_team_info', null));
  const [eventInfo, setEventInfo] = useState<any>(() => getCached('arena_event_info', null));
  const [requireToken, setRequireToken] = useState(false);
  const [requireTeam, setRequireTeam] = useState(false);
  const [requireMinMembers, setRequireMinMembers] = useState<{ min: number; current: number } | null>(null);
  
  // If we already have cached data, start immediately with loading = false (0ms load!)
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('arena_challenges');
      return !cached;
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');

  // Team & Event Inspect Modal State (bisa dilihat kapan saja saat lomba berlangsung)
  const [inspectTeamModalOpen, setInspectTeamModalOpen] = useState(false);
  const [inspectEventModalOpen, setInspectEventModalOpen] = useState(false);

  // Token Modal Dialog State
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [tokenSubmitting, setTokenSubmitting] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = (user?.role || '').toUpperCase();
  const isStaff = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(userRole);

  const fetchDashboardData = useCallback(async (silent: boolean = false) => {
    // If no cached data exists, show skeleton loader on initial fetch
    if (!silent && !sessionStorage.getItem('arena_challenges')) {
      setLoading(true);
    }
    try {
      const [chalRes, meRes, catRes] = await Promise.allSettled([
        api.get('/challenges'),
        api.get('/auth/me'),
        api.get('/challenges/categories')
      ]);

      let hasActiveEvent = false;
      let isStaffUser = false;

      if (meRes.status === 'fulfilled') {
        const userData = meRes.value.data;
        setTeamInfo(userData.team);
        setEventInfo(userData.event || userData.team?.event);
        try {
          sessionStorage.setItem('arena_team_info', JSON.stringify(userData.team));
          sessionStorage.setItem('arena_event_info', JSON.stringify(userData.event || userData.team?.event));
        } catch {}

        hasActiveEvent = Boolean(userData.event_id);
        const role = (userData.role || '').toUpperCase();
        isStaffUser = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(role);

        if (userData.event_id && socketRef.current) {
          socketRef.current.emit('join-event', userData.event_id);
          socketRef.current.emit('join-event-room', userData.event_id);
        }
      }

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data);
        try {
          sessionStorage.setItem('arena_categories', JSON.stringify(catRes.value.data));
        } catch {}
      }

      if (chalRes.status === 'fulfilled') {
        setChallenges(chalRes.value.data);
        try {
          sessionStorage.setItem('arena_challenges', JSON.stringify(chalRes.value.data));
        } catch {}
        setRequireTeam(false);
        setRequireToken(false);
        setRequireMinMembers(null);
      } else {
        setChallenges([]);
        try {
          sessionStorage.removeItem('arena_challenges');
        } catch {}
        if (!hasActiveEvent && !isStaffUser) {
          setRequireToken(true);
          setRequireTeam(false);
          setRequireMinMembers(null);
        } else if (chalRes.status === 'rejected') {
          const errorData = chalRes.reason?.response?.data;
          if (errorData?.require_token) {
            setRequireToken(true);
            setRequireTeam(false);
            setRequireMinMembers(null);
          } else if (errorData?.require_team) {
            setRequireToken(false);
            setRequireTeam(true);
            setRequireMinMembers(null);
          } else if (errorData?.require_min_members) {
            setRequireToken(false);
            setRequireTeam(false);
            setRequireMinMembers({
              min: errorData.min_team_size,
              current: errorData.current_team_size
            });
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  const handleTabChange = (val: string) => {
    if (val === 'ALL') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', val);
    }
    setSearchParams(searchParams, { replace: true });
  };

  useEffect(() => {
    // Connect to WebSocket for instant live synchronization
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('event_pause_update', (data: any) => {
      const isPaused = Boolean(data.is_paused ?? data.isPaused);
      setEventInfo((prev: any) => prev ? { ...prev, is_paused: isPaused } : prev);
      if (isPaused) {
        toast.warning(data.message || '⏸️ Kompetisi arena sedang di-pause oleh Panitia.');
      } else {
        toast.success(data.message || '▶️ Kompetisi arena telah dilanjutkan kembali!');
      }
      fetchDashboardData(true);
    });

    socket.on('event_finished_update', (data: any) => {
      const isFinished = Boolean(data.is_finished);
      setEventInfo((prev: any) => prev ? { ...prev, is_finished: isFinished } : prev);
      if (isFinished) {
        toast.error(data.message || '🏆 Event telah diselesaikan secara resmi oleh Panitia!');
      } else {
        toast.success(data.message || 'Arena event telah dibuka kembali!');
      }
      fetchDashboardData(true);
    });

    socket.on('session_control_update', () => {
      fetchDashboardData(true);
    });

    socket.on('live_activity_update', () => {
      fetchDashboardData(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchDashboardData]);

  const handleRedeemToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      toast.error('Silakan masukkan token akses event Anda');
      return;
    }

    setTokenSubmitting(true);
    try {
      const res = await api.post('/auth/events/join', { join_token: inputToken.trim().toUpperCase() });

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.event_id = res.data.event_id;
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success(res.data.message || 'Token berhasil diaktifkan! Anda telah bergabung ke event.');
      setInputToken('');
      setTokenModalOpen(false);
      setRequireToken(false);
      await fetchDashboardData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal memverifikasi token. Pastikan token valid dan belum pernah digunakan.');
    } finally {
      setTokenSubmitting(false);
    }
  };

  const filtered = challenges.filter((c) => {
    const matchCategory = activeCategory === 'ALL' || c.category === activeCategory;
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.category && c.category.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
  });

  const totalPoints = challenges.reduce((acc, c) => acc + (c.points || 0), 0);
  const solvedCount = challenges.filter((c) => c.is_solved_by_me).length;

  const dynamicCategories = categories.length > 1 ? categories : ['ALL', ...Array.from(new Set(challenges.map(c => c.category)))].sort();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* 0. Event Paused Alert Banner */}
      {eventInfo?.is_paused && !eventInfo?.is_finished && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-5 flex items-center gap-3.5 shadow-[0_0_25px_rgba(245,158,11,0.2)] animate-pulse">
          <div className="h-10 w-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Pause className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-amber-300 font-outfit uppercase tracking-wider text-sm flex items-center gap-2">
              <span>⏸️ Kompetisi Arena Sedang Di-Pause</span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono">
                TIME FROZEN
              </Badge>
            </h3>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Panitia sedang menjeda waktu kompetisi arena ini. Timer pengerjaan dan formulir submisi dibekukan sementara.
            </p>
          </div>
        </div>
      )}

      {/* 0. Event Finished Alert Banner */}
      {eventInfo?.is_finished && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-5 flex items-center gap-3.5 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="h-10 w-10 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
            <Trophy className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-amber-300 font-outfit uppercase tracking-wider text-sm flex items-center gap-2">
              <span>🏆 Kompetisi Arena Telah Selesai Secara Resmi</span>
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] font-mono">
                ARENA CLOSED
              </Badge>
            </h3>
            <p className="text-xs text-amber-200/90 mt-0.5">
              Kompetisi arena ini telah berakhir. Seluruh pengiriman flag telah dinonaktifkan dan perolehan skor akhir telah dibekukan.
            </p>
          </div>
        </div>
      )}
      {/* 1. Require Token Notice if unverified / unlinked (Participants Only) */}
      {!isStaff && requireToken && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Verifikasi Token Akses Diperlukan</h3>
              <p className="text-xs text-muted-foreground">
                Anda perlu menukarkan Access Token untuk memverifikasi kategori peserta dan membuka daftar tantangan arena Anda.
              </p>
            </div>
          </div>
          <Button onClick={() => setTokenModalOpen(true)} className="gap-2 shrink-0">
            <Key className="h-4 w-4" /> Masukkan Access Token
          </Button>
        </div>
      )}

      {/* 2. Require Team Notice if event is team based and user is solo */}
      {!requireToken && requireTeam && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
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
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
              <Users className="h-4 w-4" /> Buka Menu Squad & Tim
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Require Min Members Notice if squad size is less than minimum required */}
      {!requireToken && !requireTeam && requireMinMembers && (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
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

      {/* Arena Banner */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button
                type="button"
                onClick={() => setInspectEventModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-muted/60 text-foreground border border-border hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                title="View full arena event analytics (Accuracy, Category Breakdown, Top Leaderboard, and First Bloods)"
              >
                <span>{eventInfo?.name ? eventInfo.name : 'RISERANGER 2 CTF 2026'}</span>
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              {teamInfo && (
                <button
                  type="button"
                  onClick={() => setInspectTeamModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-colors cursor-pointer"
                  title="View squad solves vs hit missed analytics and operative roster"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Squad: {teamInfo.name}</span>
                  <span className="text-[10px] bg-primary/20 px-1.5 py-0.2 rounded border border-primary/40 ml-1">
                    View Analytics 📊
                  </span>
                </button>
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
              <div 
                className="text-center px-3 border-r cursor-pointer hover:bg-primary/10 rounded-lg transition-colors p-1 group"
                onClick={() => setInspectTeamModalOpen(true)}
                title="Klik untuk membuka diagram performa dan rincian skor anggota tim Anda"
              >
                <div className="text-2xl font-bold text-primary font-mono group-hover:scale-105 transition-transform flex items-center justify-center gap-1">
                  {teamInfo.score}
                  <BarChart3 className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                </div>
                <div className="text-xs text-muted-foreground uppercase font-medium group-hover:text-primary transition-colors flex items-center justify-center gap-1">
                  <span>Team Score</span>
                  <span className="text-[9px] text-primary">📊</span>
                </div>
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
          <Tabs value={activeCategory} onValueChange={handleTabChange} className="w-auto">
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
            {!isStaff && requireToken
              ? 'Silakan masukkan Access Token terlebih dahulu untuk membuka daftar tantangan arena Anda.'
              : !isStaff && requireTeam
                ? 'Silakan buat atau bergabung dengan Squad terlebih dahulu untuk membuka soal tantangan.'
                : !isStaff && requireMinMembers
                  ? 'Syarat minimal anggota squad belum terpenuhi untuk membuka soal arena.'
                  : isStaff
                    ? 'Belum ada tantangan yang aktif di arena ini. Anda dapat mengelola dan menambahkan tantangan di menu Challenges HQ.'
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

      {/* Token Verification Modal Dialog */}
      <Dialog open={tokenModalOpen} onOpenChange={setTokenModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary font-outfit">
              <Key className="h-5 w-5" /> Verifikasi Access Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Masukkan kode tiket / Access Token unik yang diberikan oleh panitia untuk membuka arena dan daftar tantangan CTF Anda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRedeemToken}>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Access / Event Token</span>
                  <span className="text-[10px] text-primary font-mono lowercase">single-use key</span>
                </label>
                <Input
                  placeholder="e.g. RR26-X8F9-A1B2 atau MAHA2026"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                  disabled={tokenSubmitting}
                  className="font-mono text-center tracking-widest uppercase h-10"
                  autoFocus
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setTokenModalOpen(false)} disabled={tokenSubmitting}>
                Batal
              </Button>
              <Button type="submit" disabled={tokenSubmitting || !inputToken.trim()} className="gap-2">
                {tokenSubmitting ? (
                  'Memverifikasi...'
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Aktifkan Token</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SQUAD PERFORMANCE DETAIL MODAL (DAPAT DIAKSES KAPAN SAJA SAAT LOMBA BERLANGSUNG) */}
      {teamInfo && (
        <TeamDetailModal
          teamId={teamInfo.id}
          open={inspectTeamModalOpen}
          onOpenChange={setInspectTeamModalOpen}
        />
      )}

      {/* EVENT STATS & PERFORMANCE MODAL (DAPAT DIAKSES KAPAN SAJA SAAT LOMBA BERLANGSUNG) */}
      <EventDetailModal
        eventId={eventInfo?.id}
        open={inspectEventModalOpen}
        onOpenChange={setInspectEventModalOpen}
      />
    </div>
  );
};

