import React, { useEffect, useState, useRef } from 'react';
import {
  Trophy,
  Flame,
  RotateCcw,
  Trash2,
  Search,
  Filter,

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
import { TablePagination } from '@/components/ui/TablePagination';
import { toast } from 'sonner';
import api from '@/services/api';
import socketService from '@/services/socket';
import { formatWIBDateTime } from '@/utils/date';

export const AdminFirstBloods: React.FC = () => {
  const [firstBloods, setFirstBloods] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');  // top panel (challenges + config)
  const [filterEventId, setFilterEventId] = useState<string>('');      // bottom panel (FB records filter)
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

  // Pagination & Search states
  const [chalSearch, setChalSearch] = useState('');
  const [chalPage, setChalPage] = useState(1);
  const [chalPageSize, setChalPageSize] = useState(10);

  const [fbPage, setFbPage] = useState(1);
  const [fbPageSize, setFbPageSize] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fbRes, eventsRes, chalRes] = await Promise.all([
        api.get('/admin/first-bloods', { params: filterEventId ? { event_id: filterEventId } : {} }),
        api.get('/admin/events'),
        api.get('/admin/challenges')
      ]);
      setFirstBloods(fbRes.data || []);
      const allEvents = eventsRes.data || [];
      setEvents(allEvents);

      const allChals = chalRes.data || [];
      setChallenges(selectedEventId ? allChals.filter((c: any) => c.event_id === selectedEventId) : allChals);
    } catch (err) {
      toast.error('Failed to load First Blood data.');
    } finally {
      setLoading(false);
    }
  };

  const filterEventIdRef = useRef(filterEventId);
  useEffect(() => { filterEventIdRef.current = filterEventId; }, [filterEventId]);

  const fetchFirstBloods = async () => {
    try {
      const res = await api.get('/admin/first-bloods', {
        params: filterEventIdRef.current ? { event_id: filterEventIdRef.current } : {}
      });
      setFirstBloods(res.data || []);
    } catch { /* silent fail, retain existing data */ }
  };

  const fetchFirstBloodsRef = useRef(fetchFirstBloods);
  useEffect(() => { fetchFirstBloodsRef.current = fetchFirstBloods; });

  useEffect(() => {
    fetchData();
  }, [selectedEventId, filterEventId]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!selectedEventId) return;

    const socket = socketService.connect();

    socket.emit('join-event-room', selectedEventId);

    const handleFB = (data: { team_name: string; challenge_title: string }) => {
      toast.info(`👑 New First Blood: "${data.team_name}" solved "${data.challenge_title}"`, { duration: 5000 });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { fetchFirstBloodsRef.current(); }, 1000);
    };

    socket.on('first_blood_alert', handleFB);

    return () => {
      socket.off('first_blood_alert', handleFB);
      socket.emit('leave-event-room', selectedEventId);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedEventId]);

  const handleDeleteFB = async () => {
    if (!deleteModal?.item) return;
    try {
      await api.delete(`/admin/first-bloods/${deleteModal.item.id}`);
      toast.success(deleteModal.item.challenge?.title ? `First Blood record for "${deleteModal.item.challenge.title}" reset successfully!` : 'First Blood record deleted');
      setDeleteModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete First Blood record');
    }
  };

  const handleRecalculate = async () => {
    if (!recalculateModal?.event) return;
    setRecalculating(true);
    try {
      const res = await api.post('/admin/first-bloods/recalculate', {
        event_id: recalculateModal.event.id
      });
      toast.success(res.data.message || 'Score recalculated and synced successfully!');
      setRecalculateModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to recalculate score');
    } finally {
      setRecalculating(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configModal?.event) return;
    try {
      await api.put(`/admin/events/${configModal.event.id}`, configForm);
      toast.success(`First Blood settings for "${configModal.event.name}" saved successfully!`);
      setConfigModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save configuration');
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
    const ev = events.find((e) => e.id === challenge.event_id) || challenge.event || currentSelectedEvent;
    setOverrideForm({
      fb_bonus_override: challenge.fb_bonus_override || false,
      fb_bonus_override_1st: challenge.fb_bonus_override_1st ?? (ev?.fb_bonus_1st ?? 50),
      fb_bonus_override_2nd: challenge.fb_bonus_override_2nd ?? (ev?.fb_bonus_2nd ?? 25),
      fb_bonus_override_3rd: challenge.fb_bonus_override_3rd ?? (ev?.fb_bonus_3rd ?? 10)
    });
    setChallengeOverrideModal({ open: true, challenge });
  };

  const handleSaveChallengeOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeOverrideModal?.challenge) return;
    setSavingOverride(true);
    try {
      await api.put(`/admin/challenges/${challengeOverrideModal.challenge.id}`, overrideForm);
      toast.success(`FB bonus override for "${challengeOverrideModal.challenge.title}" saved successfully!`);
      setChallengeOverrideModal(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save override');
    } finally {
      setSavingOverride(false);
    }
  };

  const filteredFBs = firstBloods.filter((fb) => {
    const matchSearch =
      fb.challenge?.title?.toLowerCase().includes(search.toLowerCase()) ||
      fb.team?.name?.toLowerCase().includes(search.toLowerCase()) ||
      fb.challenge?.category?.toLowerCase().includes(search.toLowerCase());
    const matchEvent = !filterEventId || fb.challenge?.event_id === filterEventId || fb.team?.event_id === filterEventId;
    return matchSearch && matchEvent;
  });

  const filteredChallenges = challenges.filter((c) => {
    if (!chalSearch) return true;
    const q = chalSearch.toLowerCase();
    return (
      c.title?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      (c.points && c.points.toString().includes(q))
    );
  });

  const totalChalPages = Math.ceil(filteredChallenges.length / chalPageSize) || 1;
  const paginatedChallenges = filteredChallenges.slice((chalPage - 1) * chalPageSize, chalPage * chalPageSize);

  const totalFbPages = Math.ceil(filteredFBs.length / fbPageSize) || 1;
  const paginatedFBs = filteredFBs.slice((fbPage - 1) * fbPageSize, fbPage * fbPageSize);

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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.2)]">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                First Blood & Scoring Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Control First Blood bonuses, solve podium order, dynamic decay systems, and real-time score synchronization.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 && (
            <Button
              variant="default"
              size="sm"
              disabled={recalculating}
              onClick={() => setRecalculateModal({ open: true, event: currentSelectedEvent || events[0] })}
              className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            >
              <RotateCcw className={`h-4 w-4 ${recalculating ? 'animate-spin' : ''}`} />
              <span>Recalculate &amp; Sync Score</span>
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-panel border-border/50 bg-card/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-mono text-muted-foreground uppercase">Total Claimed First Bloods</p>
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
              <p className="text-xs font-mono text-muted-foreground uppercase">Top First Blood</p>
              <p className="text-lg font-bold text-foreground truncate max-w-[180px]">
                {topTeam ? topTeam.name : 'None Yet'}
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
          <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
              <p className="text-[11px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-cyber-pink" />
                <span>Active Bonus Scheme</span>
              </p>
              {events.length > 0 && (
                <Select
                  value={selectedEventId || 'ALL'}
                  onValueChange={(val) => setSelectedEventId(val === 'ALL' ? '' : val)}
                >
                  <SelectTrigger className="h-7 text-[11px] px-2 py-0 min-w-[140px] max-w-[180px] border-border bg-muted/40 font-mono">
                    <SelectValue placeholder="Select Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="text-xs font-semibold text-primary">
                      All Arena Events
                    </SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id} className="text-xs">
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-mono text-foreground font-bold">
                1st: <span className="text-amber-400">+{currentSelectedEvent?.fb_bonus_1st ?? 50}</span> | 2nd: <span className="text-slate-300">+{currentSelectedEvent?.fb_bonus_2nd ?? 25}</span> | 3rd: <span className="text-amber-600">+{currentSelectedEvent?.fb_bonus_3rd ?? 10}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Decay: <span className="text-red-400 font-bold">-{currentSelectedEvent?.solve_decay_pts ?? 5} PTS</span> / hit after #4
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => currentSelectedEvent && openConfigModal(currentSelectedEvent)}
              disabled={!currentSelectedEvent}
              className="w-full h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 flex items-center justify-center gap-1.5 font-bold"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Configure FB Bonus &amp; Decay</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Per-Challenge FB Override Panel */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-sm text-foreground">Per-Challenge FB Bonus Overrides</span>
              <Badge variant="secondary" className="font-mono text-[11px]">
                {challenges.filter((c) => c.fb_bonus_override).length} Custom Overrides
              </Badge>
            </div>
            <span className="hidden lg:inline text-[11px] text-muted-foreground border-l border-border/60 pl-2">
              Bonus points awarded to 1st, 2nd, &amp; 3rd solvers.
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search challenge title or category..."
              value={chalSearch}
              onChange={(e) => {
                setChalSearch(e.target.value);
                setChalPage(1);
              }}
              className="pl-8 h-8 text-xs bg-background/60"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-2 px-4 font-mono uppercase text-[10px] text-muted-foreground">Challenge</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Category</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Base PTS</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">👑 1st Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">🥈 2nd Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">🥉 3rd Blood</th>
                <th className="text-center py-2 px-3 font-mono uppercase text-[10px] text-muted-foreground">Override Status</th>
                <th className="text-right py-2 px-4 font-mono uppercase text-[10px] text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {challenges.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-muted-foreground">No challenges found in this arena event</td>
                </tr>
              ) : (
                paginatedChallenges.map((c) => {
                  const ev = events.find((e) => e.id === c.event_id) || c.event || currentSelectedEvent;
                  const bonus1st = c.fb_bonus_override ? (c.fb_bonus_override_1st ?? 50) : (ev?.fb_bonus_1st ?? 50);
                  const bonus2nd = c.fb_bonus_override ? (c.fb_bonus_override_2nd ?? 25) : (ev?.fb_bonus_2nd ?? 25);
                  const bonus3rd = c.fb_bonus_override ? (c.fb_bonus_override_3rd ?? 10) : (ev?.fb_bonus_3rd ?? 10);

                  return (
                    <tr key={c.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${c.fb_bonus_override ? 'bg-muted/10' : ''
                      }`}>
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {c.fb_bonus_override && <span title="Custom FB Override Active">🔥</span>}
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
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Event Default</Badge>
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
                          Configure
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={chalPage}
          totalPages={totalChalPages}
          pageSize={chalPageSize}
          totalItems={filteredChallenges.length}
          onPageChange={setChalPage}
          onPageSizeChange={(newSize) => {
            setChalPageSize(newSize);
            setChalPage(1);
          }}
          pageSizeOptions={[5, 10, 25, 50]}
        />
      </Card>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search challenge, squad, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-muted-foreground ml-1" />
            <Select
              value={filterEventId || 'ALL'}
              onValueChange={(val) => setFilterEventId(val === 'ALL' ? '' : val)}
            >
              <SelectTrigger className="h-9 min-w-[190px] text-xs">
                <SelectValue placeholder="All Arena Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Arena Events</SelectItem>
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
                <TableHead className="min-w-[200px]">Challenge</TableHead>
                <TableHead className="w-28 text-center">Category</TableHead>
                <TableHead className="min-w-[180px]">Solver Squad (1st Blood)</TableHead>
                <TableHead className="text-center w-28">Base Points</TableHead>
                <TableHead className="text-center w-36">Awarded Points</TableHead>
                <TableHead className="min-w-[160px]">Timestamp</TableHead>
                <TableHead className="text-right w-24">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFBs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <Flame className="h-8 w-8 text-muted-foreground/40 mb-1" />
                      <p className="font-bold text-sm">No First Blood records logged yet</p>
                      <p className="text-xs text-muted-foreground">
                        First Blood records will be automatically logged when the first operative successfully solves a challenge flag.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFBs.map((fb, idx) => {
                  const globalIdx = (fbPage - 1) * fbPageSize + idx + 1;
                  const chal = fb.challenge;
                  const fbBonus = chal?.fb_bonus_override
                    ? (chal.fb_bonus_override_1st ?? 50)
                    : (chal?.event?.fb_bonus_1st ?? 50);
                  const totalPts = (chal?.points || 0) + fbBonus;
                  return (
                    <TableRow key={fb.id} className="border-border hover:bg-primary/5">
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">
                        {globalIdx}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-foreground">
                            {chal?.title || 'Unknown Challenge'}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            Event: {chal?.event?.name || fb.team?.event?.name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono uppercase text-[10px]">
                          {chal?.category || 'CTF'}
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
                        {chal?.points || 0} PTS
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

        <TablePagination
          currentPage={fbPage}
          totalPages={totalFbPages}
          pageSize={fbPageSize}
          totalItems={filteredFBs.length}
          onPageChange={setFbPage}
          onPageSizeChange={(newSize) => {
            setFbPageSize(newSize);
            setFbPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
        />
      </Card>

      {/* Delete / Revoke Confirmation Modal */}
      <Dialog open={Boolean(deleteModal?.open)} onOpenChange={(open) => !open && setDeleteModal(null)}>
        <DialogContent className="sm:max-w-md border-border bg-card">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Reset First Blood Record?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-xs pt-2 leading-relaxed">
              This action will remove First Blood status for squad{' '}
              <strong className="text-foreground">{deleteModal?.item?.team?.name}</strong> on challenge{' '}
              <strong className="text-foreground">{deleteModal?.item?.challenge?.title}</strong>.
              <br />
              <br />
              After deletion, you can run <em>Recalculate & Sync Score</em> to automatically update total squad points across the scoreboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteFB}>
              Yes, Reset First Blood
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
              <DialogTitle>Recalculate All Event Scores?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-xs pt-2 leading-relaxed">
              The system will recalculate all squad points in event{' '}
              <strong className="text-foreground">{recalculateModal?.event?.name}</strong> based on:
              <ul className="list-disc pl-4 mt-2 space-y-1 text-foreground/80 font-mono text-[11px]">
                <li>Solve Podium Sequence (Hit #1: +{recalculateModal?.event?.fb_bonus_1st ?? 50}, Hit #2: +{recalculateModal?.event?.fb_bonus_2nd ?? 25}, Hit #3: +{recalculateModal?.event?.fb_bonus_3rd ?? 10})</li>
                <li>Per-solve decay penalty ({recalculateModal?.event?.solve_decay_pts ?? 5} PTS after #4)</li>
                <li>Hint unlock cost deductions</li>
                <li>Jury writeup evaluation scores</li>
              </ul>
              Scoreboard and chart data will be instantly synced to all participants in real-time via WebSocket.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setRecalculateModal(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={recalculating}
              onClick={handleRecalculate}
              className="bg-primary text-primary-foreground font-bold"
            >
              {recalculating ? 'Recalculating...' : 'Start Recalculate & Sync'}
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
              <DialogTitle>Configure FB Bonus & Solve Order</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure First Blood bonus points and solve decay penalties for event{' '}
              <strong className="text-foreground">{configModal?.event?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveConfig} className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Enable First Blood & Rank Bonus</p>
                <p className="text-xs text-muted-foreground">
                  If disabled, all solvers receive the same base points with no solve-order bonus.
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
                <label className="text-xs font-mono font-bold text-red-400 flex items-center gap-1">
                  📉 Decay per Solve (PTS)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={configForm.solve_decay_pts}
                  onChange={(e) => setConfigForm({ ...configForm, solve_decay_pts: parseInt(e.target.value) || 0 })}
                  className="font-mono text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Points deducted per solver starting from solve #5 onwards. Solve #4 receives base points (no bonus/penalty). Min floor: 50% of base points. Set to 0 to disable decay.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfigModal(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="default" size="sm" className="bg-primary text-primary-foreground font-bold">
                Save Configuration
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
              <DialogTitle>FB Bonus Override: {challengeOverrideModal?.challenge?.title}</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Configure challenge-specific First Blood bonus. This overrides event-level settings when enabled.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChallengeOverride} className="space-y-4 py-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Enable Override for this Challenge</p>
                <p className="text-[11px] text-muted-foreground">When active, the custom bonus values below will be used exclusively for this challenge.</p>
              </div>
              <div
                onClick={() => setOverrideForm({ ...overrideForm, fb_bonus_override: !overrideForm.fb_bonus_override })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${overrideForm.fb_bonus_override ? 'bg-amber-500' : 'bg-muted'
                  }`}
              >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${overrideForm.fb_bonus_override ? 'translate-x-4' : 'translate-x-0'
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
              <Button type="button" variant="outline" size="sm" onClick={() => setChallengeOverrideModal(null)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={savingOverride} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                {savingOverride ? 'Saving...' : 'Save Override'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminFirstBloods;
