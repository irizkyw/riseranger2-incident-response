import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Flame,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Award,
  Clock,
  Shield,
  Layers,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Medal
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';
import { formatWIBDateTime } from '@/utils/date';

export const AdminFirstBloods: React.FC = () => {
  const [firstBloods, setFirstBloods] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [search, setSearch] = useState('');
  
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; item: any } | null>(null);
  const [recalculateModal, setRecalculateModal] = useState<{ open: boolean; event: any } | null>(null);
  const [configModal, setConfigModal] = useState<{ open: boolean; event: any } | null>(null);
  const [configForm, setConfigForm] = useState({
    enable_fb_bonus: true,
    fb_bonus_1st: 50,
    fb_bonus_2nd: 25,
    fb_bonus_3rd: 10,
    solve_decay_pts: 5
  });

  // Per-challenge override state
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengeOverrideModal, setChallengeOverrideModal] = useState<{ open: boolean; challenge: any } | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    fb_bonus_override: false,
    fb_bonus_override_1st: 50,
    fb_bonus_override_2nd: 25,
    fb_bonus_override_3rd: 10
  });
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fbRes, eventsRes, chalRes] = await Promise.all([
        api.get('/admin/first-bloods', { params: selectedEventId ? { event_id: selectedEventId } : {} }),
        api.get('/admin/events'),
        api.get('/admin/challenges')
      ]);
      setFirstBloods(fbRes.data || []);
      setEvents(eventsRes.data || []);
      const allChals = chalRes.data || [];
      // Filter by selected event if any
      setChallenges(selectedEventId ? allChals.filter((c: any) => c.event_id === selectedEventId) : allChals);
    } catch (err) {
      toast.error('Gagal memuat data First Blood.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedEventId]);

  const handleDeleteFB = async () => {
    if (!deleteModal?.item) return;
    try {
      await api.delete(`/admin/first-bloods/${deleteModal.item.id}`);
      toast.success(deleteModal.item.challenge?.title ? `Rekor First Blood untuk "${deleteModal.item.challenge.title}" berhasil di-reset!` : 'Rekor First Blood dihapus');
      setDeleteModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menghapus rekor First Blood');
    }
  };

  const handleRecalculate = async () => {
    if (!recalculateModal?.event) return;
    setRecalculating(true);
    try {
      const res = await api.post('/admin/first-bloods/recalculate', {
        event_id: recalculateModal.event.id
      });
      toast.success(res.data.message || 'Skor berhasil dikalkulasi ulang!');
      setRecalculateModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengkalkulasi ulang skor');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModal?.event) return;
    try {
      await api.put(`/admin/events/${configModal.event.id}`, configForm);
      toast.success(`Pengaturan First Blood untuk "${configModal.event.name}" berhasil disimpan!`);
      setConfigModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan konfigurasi');
    }
  };

  const openConfigModal = (event: any) => {
    setConfigForm({
      enable_fb_bonus: event.enable_fb_bonus !== undefined ? event.enable_fb_bonus : true,
      fb_bonus_1st: event.fb_bonus_1st !== undefined ? event.fb_bonus_1st : 50,
      fb_bonus_2nd: event.fb_bonus_2nd !== undefined ? event.fb_bonus_2nd : 25,
      fb_bonus_3rd: event.fb_bonus_3rd !== undefined ? event.fb_bonus_3rd : 10,
      solve_decay_pts: event.solve_decay_pts !== undefined ? event.solve_decay_pts : 5
    });
    setConfigModal({ open: true, event });
  };

  const openChallengeOverrideModal = (challenge: any) => {
    setOverrideForm({
      fb_bonus_override: challenge.fb_bonus_override || false,
      fb_bonus_override_1st: challenge.fb_bonus_override_1st ?? 50,
      fb_bonus_override_2nd: challenge.fb_bonus_override_2nd ?? 25,
      fb_bonus_override_3rd: challenge.fb_bonus_override_3rd ?? 10
    });
    setChallengeOverrideModal({ open: true, challenge });
  };

  const handleSaveChallengeOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeOverrideModal?.challenge) return;
    setSavingOverride(true);
    try {
      await api.put(`/admin/challenges/${challengeOverrideModal.challenge.id}`, overrideForm);
      toast.success(`Override FB bonus untuk "${challengeOverrideModal.challenge.title}" berhasil disimpan!`);
      setChallengeOverrideModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal menyimpan override');
    } finally {
      setSavingOverride(false);
    }
  };

  const filteredFBs = firstBloods.filter((fb) => {
    const matchSearch =
      fb.challenge?.title?.toLowerCase().includes(search.toLowerCase()) ||
      fb.team?.name?.toLowerCase().includes(search.toLowerCase()) ||
      fb.challenge?.category?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Analytics
  const teamFBCounter: Record<string, { count: number; name: string; color?: string }> = {};
  firstBloods.forEach((fb) => {
    if (fb.team?.name) {
      if (!teamFBCounter[fb.team.id]) {
        teamFBCounter[fb.team.id] = { count: 0, name: fb.team.name, color: fb.team.color };
      }
      teamFBCounter[fb.team.id].count += 1;
    }
  });
  const topTeam = Object.values(teamFBCounter).sort((a, b) => b.count - a.count)[0];

  const currentSelectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Pengelolaan First Blood & Skor
              </h1>
              <p className="text-sm text-muted-foreground">
                Kontrol bonus First Blood, hit podium, sistem decay per solve, dan sinkronisasi skor real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentSelectedEvent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openConfigModal(currentSelectedEvent)}
              className="gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <Settings2 className="h-4 w-4" />
              <span>Konfigurasi Bonus FB</span>
            </Button>
          )}

          {events.length > 0 && (
            <Button
              variant="default"
              size="sm"
              disabled={recalculating}
              onClick={() => setRecalculateModal({ open: true, event: currentSelectedEvent || events[0] })}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <RotateCcw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              <span>Hitung Ulang & Sync Skor</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={fetchData}
            title="Refresh Data"
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase">Total First Bloods Terklaim</p>
              <p className="text-2xl font-black text-amber-400 font-mono drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]">
                {firstBloods.length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Trophy className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase">Top First Blood Striker</p>
              <p className="text-lg font-bold text-foreground truncate max-w-[180px]">
                {topTeam ? topTeam.name : 'Belum Ada'}
              </p>
              {topTeam && (
                <span className="text-xs font-mono text-amber-400">
                  {topTeam.count} First Bloods
                </span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase">Skema Bonus Aktif</p>
              <p className="text-xs font-mono text-foreground font-bold">
                1st: <span className="text-amber-400">+{currentSelectedEvent?.fb_bonus_1st ?? 50}</span> | 2nd: <span className="text-slate-300">+{currentSelectedEvent?.fb_bonus_2nd ?? 25}</span> | 3rd: <span className="text-amber-600">+{currentSelectedEvent?.fb_bonus_3rd ?? 10}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Decay: -{currentSelectedEvent?.solve_decay_pts ?? 5} PTS / hit setelah #4
              </p>
            </div>
            <div className="p-3 rounded-lg bg-cyber-pink/10 border border-cyber-pink/20 text-cyber-pink">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Challenge FB Override Panel */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="font-bold text-sm text-foreground">Pengaturan Bonus FB per Soal</span>
            <Badge variant="secondary" className="font-mono">
              {challenges.filter((c) => c.fb_bonus_override).length} Custom Override
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground">Nilai bonus di bawah adalah bonus poin yang akan diterima pemecah 1st, 2nd, & 3rd.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-2 px-4 font-mono uppercase text-[10px] text-muted-foreground">Soal</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Kategori</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Base PTS</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">👑 1st Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">🥈 2nd Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">🥉 3rd Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Status Setting</th>
                <th className="text-right py-2 px-4 font-mono uppercase text-[10px] text-muted-foreground">Kelola</th>
              </tr>
            </thead>
            <tbody>
              {challenges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-muted-foreground">Pilih event untuk melihat daftar soal</td>
                </tr>
              ) : (
                challenges.map((c) => {
                  const ev = c.event || events.find((e) => e.id === c.event_id) || currentSelectedEvent;
                  const bonus1st = c.fb_bonus_override ? (c.fb_bonus_override_1st ?? 50) : (ev?.fb_bonus_1st ?? 50);
                  const bonus2nd = c.fb_bonus_override ? (c.fb_bonus_override_2nd ?? 25) : (ev?.fb_bonus_2nd ?? 25);
                  const bonus3rd = c.fb_bonus_override ? (c.fb_bonus_override_3rd ?? 10) : (ev?.fb_bonus_3rd ?? 10);

                  return (
                    <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      c.fb_bonus_override ? 'bg-muted/10' : ''
                    }`}>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {c.fb_bonus_override && <span title="Custom FB Override Aktif">🔥</span>}
                          {c.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">{ev?.name || c.event?.name || 'All Arenas'}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant="secondary" className="font-mono uppercase text-[10px]">
                          {c.category}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-foreground">{c.points}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold ${c.fb_bonus_override ? 'text-primary' : 'text-foreground'}`}>
                          +{bonus1st}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold ${c.fb_bonus_override ? 'text-primary' : 'text-foreground'}`}>
                          +{bonus2nd}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold ${c.fb_bonus_override ? 'text-primary' : 'text-foreground'}`}>
                          +{bonus3rd}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {c.fb_bonus_override ? (
                          <Badge variant="default" className="text-[10px]">🔥 Custom</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Default Event</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openChallengeOverrideModal(c)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1" />
                          Atur
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari challenge, tim, atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground ml-1" />
            <Select
              value={selectedEventId || 'ALL'}
              onValueChange={(val) => setSelectedEventId(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="h-9 min-w-[190px] text-xs">
                <SelectValue placeholder="Semua Event Arena" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Event Arena</SelectItem>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs font-mono text-muted-foreground px-2.5 py-1 bg-muted/40 border border-border rounded">
          {filteredFBs.length} First Blood Records
        </div>
      </div>

      {/* First Blood Records Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[200px]">Challenge / Soal</TableHead>
                <TableHead className="w-28 text-center">Kategori</TableHead>
                <TableHead className="min-w-[180px]">Tim Solver (1st Blood)</TableHead>
                <TableHead className="text-center w-28">Poin Dasar</TableHead>
                <TableHead className="text-center w-36">Bonus Diterima</TableHead>
                <TableHead className="min-w-[160px]">Waktu Tercapai</TableHead>
                <TableHead className="text-right w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFBs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Flame className="h-8 w-8 text-muted-foreground/40 mb-1" />
                      <p className="font-bold text-sm">Belum ada First Blood tercatat</p>
                      <p className="text-xs text-muted-foreground">
                        First Blood akan otomatis tercatat saat peserta pertama berhasil men-solve flag.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFBs.map((fb, idx) => {
                  const fbBonus = fb.challenge?.event?.fb_bonus_1st !== undefined ? fb.challenge.event.fb_bonus_1st : 50;
                  const totalPts = (fb.challenge?.points || 0) + fbBonus;
                  return (
                    <TableRow key={fb.id} className="border-border hover:bg-primary/5">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">
                            {fb.challenge?.title || 'Unknown Challenge'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Event: {fb.challenge?.event?.name || fb.team?.event?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono uppercase text-[10px]">
                          {fb.challenge?.category || 'CTF'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: fb.team?.color || '#00f0ff' }}
                          />
                          <span className="font-bold text-sm text-foreground">
                            {fb.team?.name || 'Unknown Squad'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs font-bold text-foreground">
                        {fb.challenge?.points || 0} PTS
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-mono text-xs font-bold text-primary">
                            +{totalPts} PTS
                          </span>
                          <Badge variant="secondary" className="text-[10px] font-mono whitespace-nowrap">
                            👑 1st FB (+{fbBonus})
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{formatWIBDateTime(fb.achieved_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteModal({ open: true, item: fb })}
                          title="Reset / Revoke First Blood"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete / Revoke Confirmation Modal */}
      <Dialog open={Boolean(deleteModal?.open)} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Reset Rekor First Blood?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-xs pt-2 leading-relaxed">
              Tindakan ini akan menghapus status First Blood dari tim{' '}
              <strong className="text-foreground">{deleteModal?.item?.team?.name}</strong> pada challenge{' '}
              <strong className="text-foreground">{deleteModal?.item?.challenge?.title}</strong>.
              <br />
              <br />
              Setelah dihapus, Anda dapat menjalankan <em>Hitung Ulang & Sync Skor</em> untuk memperbarui total poin seluruh tim secara otomatis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteModal(null)}>
              Batal
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteFB}>
              Ya, Reset First Blood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recalculate Confirmation Modal */}
      <Dialog open={Boolean(recalculateModal?.open)} onOpenChange={(open) => !open && setRecalculateModal(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-5 w-5" />
              <DialogTitle>Kalkulasi Ulang Seluruh Skor Event?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-xs pt-2 leading-relaxed">
              Sistem akan menghitung ulang seluruh poin tim di event{' '}
              <strong className="text-foreground">{recalculateModal?.event?.name}</strong> berdasarkan:
              <ul className="list-disc pl-4 mt-2 space-y-1 text-foreground/80 font-mono text-[11px]">
                <li>Urutan Solve (Hit #1: +{recalculateModal?.event?.fb_bonus_1st ?? 50}, Hit #2: +{recalculateModal?.event?.fb_bonus_2nd ?? 25}, Hit #3: +{recalculateModal?.event?.fb_bonus_3rd ?? 10})</li>
                <li>Pengurangan Decay per solve ({recalculateModal?.event?.solve_decay_pts ?? 5} PTS setelah #4)</li>
                <li>Pengurangan biaya pembukaan Hint</li>
                <li>Nilai laporan / writeup dari dewan juri</li>
              </ul>
              Scoreboard dan grafik chart akan langsung di-sync ke semua peserta secara real-time via WebSocket.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRecalculateModal(null)}>
              Batal
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={recalculating}
              onClick={handleRecalculate}
              className="bg-primary text-primary-foreground font-bold"
            >
              {recalculating ? 'Sedang Menghitung...' : 'Mulai Hitung Ulang & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FB Bonus Config Modal */}
      <Dialog open={Boolean(configModal?.open)} onOpenChange={(open) => !open && setConfigModal(null)}>
        <DialogContent className="sm:max-w-lg border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400">
              <Settings2 className="h-5 w-5" />
              <DialogTitle>Konfigurasi Bonus FB & Solve Order</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Atur nilai bonus First Blood dan penalti decay solver untuk event{' '}
              <strong className="text-foreground">{configModal?.event?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConfig} className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Aktifkan Bonus First Blood & Rank</p>
                <p className="text-xs text-muted-foreground">
                  Jika dimatikan, semua solver mendapatkan poin dasar yang sama tanpa bonus urutan.
                </p>
              </div>
              <input
                type="checkbox"
                checked={configForm.enable_fb_bonus}
                onChange={(e) => setConfigForm({ ...configForm, enable_fb_bonus: e.target.checked })}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                  👑 1st Blood Bonus (PTS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={configForm.fb_bonus_1st}
                  onChange={(e) => setConfigForm({ ...configForm, fb_bonus_1st: parseInt(e.target.value) || 0 })}
                  className="font-mono text-sm"
                  disabled={!configForm.enable_fb_bonus}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                  🥈 2nd Blood Bonus (PTS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={configForm.fb_bonus_2nd}
                  onChange={(e) => setConfigForm({ ...configForm, fb_bonus_2nd: parseInt(e.target.value) || 0 })}
                  className="font-mono text-sm"
                  disabled={!configForm.enable_fb_bonus}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-amber-600 flex items-center gap-1">
                  🥉 3rd Blood Bonus (PTS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={configForm.fb_bonus_3rd}
                  onChange={(e) => setConfigForm({ ...configForm, fb_bonus_3rd: parseInt(e.target.value) || 0 })}
                  className="font-mono text-sm"
                  disabled={!configForm.enable_fb_bonus}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-muted-foreground flex items-center gap-1">
                  📉 Solve Decay per Hit (PTS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={configForm.solve_decay_pts}
                  onChange={(e) => setConfigForm({ ...configForm, solve_decay_pts: parseInt(e.target.value) || 0 })}
                  className="font-mono text-sm"
                  disabled={!configForm.enable_fb_bonus}
                />
                <p className="text-[10px] text-muted-foreground">
                  Pengurangan per solver mulai hit #5 (maksimal 30% dari base points).
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfigModal(null)}>
                Batal
              </Button>
              <Button type="submit" variant="default" size="sm" className="bg-primary text-primary-foreground font-bold">
                Simpan Konfigurasi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Per-Challenge Override Edit Modal */}
      <Dialog open={Boolean(challengeOverrideModal?.open)} onOpenChange={(open) => !open && setChallengeOverrideModal(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400">
              <Flame className="h-5 w-5" />
              <DialogTitle>Override Bonus FB: {challengeOverrideModal?.challenge?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Konfigurasi bonus First Blood khusus untuk soal ini. Akan menggantikan konfigurasi level event jika diaktifkan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChallengeOverride} className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Aktifkan Override per Soal Ini</p>
                <p className="text-[11px] text-muted-foreground">Jika aktif, nilai bonus di bawah digunakan untuk soal ini saja.</p>
              </div>
              <div
                onClick={() => setOverrideForm({ ...overrideForm, fb_bonus_override: !overrideForm.fb_bonus_override })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  overrideForm.fb_bonus_override ? 'bg-amber-500' : 'bg-muted'
                }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                  overrideForm.fb_bonus_override ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </div>
            </div>

            {overrideForm.fb_bonus_override && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-extrabold text-amber-400">👑 1st Blood (+PTS)</label>
                    <Input
                      type="number"
                      min={0}
                      value={overrideForm.fb_bonus_override_1st}
                      onChange={(e) => setOverrideForm({ ...overrideForm, fb_bonus_override_1st: parseInt(e.target.value) || 0 })}
                      className="font-mono text-amber-400 font-bold border-amber-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-slate-300">🥈 2nd Blood (+PTS)</label>
                    <Input
                      type="number"
                      min={0}
                      value={overrideForm.fb_bonus_override_2nd}
                      onChange={(e) => setOverrideForm({ ...overrideForm, fb_bonus_override_2nd: parseInt(e.target.value) || 0 })}
                      className="font-mono text-slate-300 font-bold border-slate-500/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-amber-600">🥉 3rd Blood (+PTS)</label>
                    <Input
                      type="number"
                      min={0}
                      value={overrideForm.fb_bonus_override_3rd}
                      onChange={(e) => setOverrideForm({ ...overrideForm, fb_bonus_override_3rd: parseInt(e.target.value) || 0 })}
                      className="font-mono text-amber-600 font-bold border-amber-600/30"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1.5 border border-border">
                  Preview: 1st solver → <strong className="text-amber-400">{(challengeOverrideModal?.challenge?.points || 0) + (overrideForm.fb_bonus_override_1st || 0)} PTS</strong>
                  {' · '}2nd solver → <strong className="text-slate-300">{(challengeOverrideModal?.challenge?.points || 0) + (overrideForm.fb_bonus_override_2nd || 0)} PTS</strong>
                  {' · '}3rd solver → <strong className="text-amber-600">{(challengeOverrideModal?.challenge?.points || 0) + (overrideForm.fb_bonus_override_3rd || 0)} PTS</strong>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setChallengeOverrideModal(null)}>Batal</Button>
              <Button type="submit" size="sm" disabled={savingOverride} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                {savingOverride ? 'Menyimpan...' : 'Simpan Override'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminFirstBloods;
