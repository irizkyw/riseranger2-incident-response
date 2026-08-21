import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Shield,
  Search,
  Trophy,
  Key,
  Sparkles,
  Users,
  Pause,
  BarChart3,
  Layers,
  ShieldAlert,
  PlusCircle
} from 'lucide-react';
import { ChallengeCard } from '@/components/ChallengeCard';
import { TeamDetailModal } from '@/components/TeamDetailModal';
import { EventDetailModal } from '@/components/EventDetailModal';
import { EventCountdown } from '@/components/EventCountdown';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  // List of all events for multi-event switcher
  const [events, setEvents] = useState<any[]>(() => getCached('dashboard_all_events', []));
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    const urlEventId = searchParams.get('event_id');
    return urlEventId || sessionStorage.getItem('dashboard_selected_event_id') || localStorage.getItem('dashboard_event_id') || '';
  });

  // Client-side Instant Cache (Stale-While-Revalidate pattern)
  const [challenges, setChallenges] = useState<any[]>(() => getCached('arena_challenges', []));
  const [categories, setCategories] = useState<string[]>(() => getCached('arena_categories', ['ALL']));
  const [teamInfo, setTeamInfo] = useState<any>(() => getCached('arena_team_info', null));
  const [eventInfo, setEventInfo] = useState<any>(() => getCached('arena_event_info', null));
  const [requireToken, setRequireToken] = useState(false);
  const [requireTeam, setRequireTeam] = useState(false);
  const [requireMinMembers, setRequireMinMembers] = useState<{ min: number; current: number } | null>(null);

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      const cached = sessionStorage.getItem('arena_challenges');
      return !cached;
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');

  // Team & Event Inspect Modal State
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

  const fetchEvents = useCallback(async () => {
    if (!isStaff) return [];
    try {
      const res = await api.get('/scoreboard/events?all=true');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setEvents(res.data);
        try {
          sessionStorage.setItem('dashboard_all_events', JSON.stringify(res.data));
        } catch { }
        return res.data;
      }
      return [];
    } catch (err) {
      console.error('Failed to fetch events:', err);
      return [];
    }
  }, [isStaff]);

  const fetchDashboardData = useCallback(async (targetEventId?: string, silent: boolean = false) => {
    if (!silent && !sessionStorage.getItem('arena_challenges')) {
      setLoading(true);
    }
    try {
      const params: any = {};
      if (targetEventId) {
        params.event_id = targetEventId;
      }

      const [chalRes, meRes, catRes] = await Promise.allSettled([
        api.get('/challenges', { params }),
        api.get('/auth/me'),
        api.get('/challenges/categories', { params })
      ]);

      let hasActiveEvent = false;
      let isStaffUser = false;
      let userData: any = null;

      if (meRes.status === 'fulfilled') {
        userData = meRes.value.data;
        setTeamInfo(userData.team);
        try {
          sessionStorage.setItem('arena_team_info', JSON.stringify(userData.team));
        } catch { }

        const role = (userData.role || '').toUpperCase();
        isStaffUser = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR'].includes(role);
      }

      // Resolve event info
      let ev = null;
      if (targetEventId) {
        // Try finding from cached / fetched events
        ev = events.find((e: any) => e.id === targetEventId);
        if (!ev) {
          try {
            const evRes = await api.get('/scoreboard/events?all=true');
            setEvents(evRes.data || []);
            ev = (evRes.data || []).find((e: any) => e.id === targetEventId);
          } catch { }
        }
      }

      if (!ev && userData) {
        ev = userData.event || userData.team?.event;
      }

      if (!ev) {
        try {
          const evRes = await api.get('/scoreboard/events?all=true');
          if (Array.isArray(evRes.data) && evRes.data.length > 0) {
            setEvents(evRes.data);
            ev = targetEventId ? (evRes.data.find((e: any) => e.id === targetEventId) || evRes.data[0]) : evRes.data[0];
          }
        } catch { }
      }

      if (ev) {
        setEventInfo(ev);
        setSelectedEventId(ev.id);
        hasActiveEvent = Boolean(ev.id);
        try {
          sessionStorage.setItem('arena_event_info', JSON.stringify(ev));
          sessionStorage.setItem('dashboard_selected_event_id', ev.id);
        } catch { }

        if (socketRef.current) {
          socketRef.current.emit('join-event', ev.id);
          socketRef.current.emit('join-event-room', ev.id);
        }
      }

      if (catRes.status === 'fulfilled' && Array.isArray(catRes.value.data)) {
        setCategories(catRes.value.data);
        try {
          sessionStorage.setItem('arena_categories', JSON.stringify(catRes.value.data));
        } catch { }
      }

      if (chalRes.status === 'fulfilled') {
        setChallenges(chalRes.value.data);
        try {
          sessionStorage.setItem('arena_challenges', JSON.stringify(chalRes.value.data));
        } catch { }
        setRequireTeam(false);
        setRequireToken(false);
        setRequireMinMembers(null);
      } else {
        setChallenges([]);
        try {
          sessionStorage.removeItem('arena_challenges');
        } catch { }
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
  }, [events]);

  const handleSelectEvent = (newEventId: string) => {
    setSelectedEventId(newEventId);
    try {
      sessionStorage.setItem('dashboard_selected_event_id', newEventId);
      localStorage.setItem('dashboard_event_id', newEventId);
    } catch { }

    fetchDashboardData(newEventId, false);
  };

  useEffect(() => {
    const init = async () => {
      const urlEventId = searchParams.get('event_id');
      if (urlEventId) {
        // Clean up url parameter so URL remains purely /dashboard
        searchParams.delete('event_id');
        setSearchParams(searchParams, { replace: true });
      }

      if (isStaff) {
        const allEvs = await fetchEvents();
        let targetId = urlEventId || sessionStorage.getItem('dashboard_selected_event_id') || localStorage.getItem('dashboard_event_id');
        if (!targetId || !allEvs.some((e: any) => e.id === targetId)) {
          if (allEvs.length > 0) {
            targetId = allEvs[0].id;
          }
        }
        if (targetId) {
          setSelectedEventId(targetId);
        }
        fetchDashboardData(targetId || undefined, false);
      } else {
        // Regular Participant: strictly load their own assigned event
        fetchDashboardData(undefined, false);
      }
    };
    init();
  }, [fetchEvents, isStaff]);

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
        toast.warning(data.message || 'Competition arena has been paused by organizers.');
      } else {
        toast.success(data.message || 'Competition arena has resumed!');
      }
      fetchDashboardData(selectedEventId, true);
    });

    socket.on('event_finished_update', (data: any) => {
      const isFinished = Boolean(data.is_finished);
      setEventInfo((prev: any) => prev ? { ...prev, is_finished: isFinished } : prev);
      if (isFinished) {
        toast.error(data.message || '🏆 The competition has been officially finished by the organizers!');
      } else {
        toast.success(data.message || 'The arena has been opened again!');
      }
      fetchDashboardData(selectedEventId, true);
    });

    socket.on('session_control_update', () => {
      fetchDashboardData(selectedEventId, true);
    });

    socket.on('live_activity_update', () => {
      fetchDashboardData(selectedEventId, true);
    });

    socket.on('challenge_visibility_update', () => {
      fetchDashboardData(selectedEventId, true);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchDashboardData, selectedEventId]);

  const handleRedeemToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputToken.trim()) {
      toast.error('Please enter your event access token');
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

      toast.success(res.data.message || 'Token activated successfully! You have joined the event.');
      setInputToken('');
      setTokenModalOpen(false);
      setRequireToken(false);
      setSelectedEventId(res.data.event_id);
      await fetchDashboardData(res.data.event_id, false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to verify token. Make sure the token is valid and unused.');
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
              <span>Competition Arena Paused</span>
              <Badge variant="outline" className="font-mono">
                TIME FROZEN
              </Badge>
            </h3>
            <p className="text-xs text-amber-200/90 mt-0.5">
              The organizers have paused the competition timer. Solve timers and flag submission forms are temporarily frozen.
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
              <span>🏆 Competition Officially Concluded</span>
              <Badge variant="outline" className="font-mono">
                ARENA CLOSED
              </Badge>
            </h3>
            <p className="text-xs text-amber-200/90 mt-0.5">
              This competition arena has ended. All flag submissions have been disabled and final scores have been frozen.
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
              <h3 className="font-bold text-foreground">Access Token Verification Required</h3>
              <p className="text-xs text-muted-foreground">
                You need to enter an Access Token to verify your participant category and unlock your arena challenge list.
              </p>
            </div>
          </div>
          <Button onClick={() => setTokenModalOpen(true)} className="gap-2 shrink-0">
            <Key className="h-4 w-4" /> Enter Access Token
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
              <h3 className="font-bold text-foreground">Squad Participation Required</h3>
              <p className="text-xs text-muted-foreground">
                This arena is team-based. You are not currently in a team. Please create or join a squad to access the challenges.
              </p>
            </div>
          </div>
          <Link to="/team">
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
              <Users className="h-4 w-4" /> Go to Squad Menu
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
                <h3 className="font-bold text-foreground">Minimum Member Requirement Not Met</h3>
                <Badge variant="outline" className="font-mono">
                  {requireMinMembers.current} / {requireMinMembers.min} Members
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                This event requires at least <strong>{requireMinMembers.min} members</strong> per squad to unlock challenges. Invite teammates using your Squad Invite Code in the Squad menu!
              </p>
            </div>
          </div>
          <Link to="/team">
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
              <Users className="h-4 w-4" /> Manage Squad Members
            </Button>
          </Link>
        </div>
      )}

      {/* Arena Banner */}
      <div className="rounded-xl border bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 w-full lg:w-auto">
            {/* Top Bar: Event Selector Dropdown for Staff, or Static Event Badge for Participants */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {isStaff ? (
                <>
                  {events.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Select value={selectedEventId || eventInfo?.id || ''} onValueChange={handleSelectEvent}>
                        <SelectTrigger className="h-8 text-xs font-mono font-bold bg-background/90 border-primary/40 hover:border-primary text-foreground min-w-[200px] sm:min-w-[280px] max-w-[380px] shadow-sm">
                          <div className="flex items-center gap-2 truncate">
                            <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="truncate font-bold">{eventInfo?.name || 'Select Arena Event'}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border z-[10005] max-w-[420px]">
                          {events.map((e) => (
                            <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                              <div className="flex items-center justify-between gap-3 w-full">
                                <span className="truncate font-bold">{e.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-1 uppercase whitespace-nowrap">
                                  {e.is_finished ? '🏁 Closed' : e.is_paused ? '⏸️ Paused' : e.is_active ? '🟢 Active' : '⚪ Inactive'}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Staff Analytics button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectEventModalOpen(true)}
                    className="h-8 px-2.5 text-xs font-mono font-bold bg-muted/50 hover:bg-primary/10 hover:text-primary border-border"
                    title="View Arena Event Analytics & Accuracy Diagram"
                  >
                    <BarChart3 className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span>Analytics</span>
                  </Button>

                  {/* Staff Indicator Badge */}
                  {/* <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-amber-500/50 bg-amber-500/10 text-amber-300 gap-1">
                    <ShieldAlert className="h-3 w-3 text-amber-400" />
                    <span>Staff Preview</span>
                  </Badge> */}

                  {/* Inactive Event Notice for Staff */}
                  {eventInfo && !eventInfo.is_active && (
                    <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 border-muted-foreground/40 bg-muted/40 text-muted-foreground">
                      Inactive Event
                    </Badge>
                  )}
                </>
              ) : (
                /* Participant: Clickable event badge that opens the Event Analytics modal */
                <button
                  type="button"
                  onClick={() => setInspectEventModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-muted/60 text-foreground border border-border hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  title="View full arena event analytics, category breakdown & accuracy statistics"
                >
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  <span>{eventInfo?.name ? eventInfo.name : 'RISERANGER 2 CTF 2026'}</span>
                </button>
              )}

              {/* Squad Badge if in team */}
              {teamInfo && (
                <button
                  type="button"
                  onClick={() => setInspectTeamModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-colors cursor-pointer"
                  title="View squad solves vs hit missed analytics and operative roster"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>Squad: {teamInfo.name}</span>
                </button>
              )}

              {/* Live Arena Event Countdown Timer */}
              <EventCountdown
                startTime={eventInfo?.start_time}
                endTime={eventInfo?.end_time}
                freezeTime={eventInfo?.freeze_time}
                isPaused={eventInfo?.is_paused}
                isFinished={eventInfo?.is_finished}
                eventName={eventInfo?.name}
                variant="header"
              />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase font-outfit">
              CAPTURE THE FLAG
            </h1>
            <p className="text-muted-foreground max-w-2xl text-sm">
              Infiltrate vulnerable targets, decipher encrypted transmissions, and reverse-engineer binaries to acquire flags. Submit flags to elevate your squad's rank.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border shrink-0">
            {teamInfo && (
              <div
                className="text-center px-3 border-r cursor-pointer hover:bg-primary/10 rounded-lg transition-colors p-1 group"
                onClick={() => setInspectTeamModalOpen(true)}
                title="Click to view your squad performance diagram and score breakdown"
              >
                <div className="text-2xl font-bold text-primary font-mono group-hover:scale-105 transition-transform flex items-center justify-center gap-1">
                  {teamInfo.score}
                  <BarChart3 className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                </div>
                <div className="text-xs text-muted-foreground uppercase font-medium group-hover:text-primary transition-colors flex items-center justify-center gap-1">
                  <span>Team Score</span>
                </div>
              </div>
            )}
            <div className="text-center px-3">
              <div className="text-2xl font-bold text-foreground">{solvedCount} / {challenges.length}</div>
              <div className="text-xs text-muted-foreground uppercase font-medium">Solved</div>
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

      {/* Challenges Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-44 rounded-lg bg-card border animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border bg-card space-y-4">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground font-outfit">
              {challenges.length === 0
                ? `No challenges found in arena "${eventInfo?.name || 'Event'}"`
                : 'No matching challenges found'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              {!isStaff && requireToken
                ? 'Please enter your Access Token to unlock the challenge list for your arena.'
                : !isStaff && requireTeam
                  ? 'Please create or join a Squad first to unlock arena challenges.'
                  : !isStaff && requireMinMembers
                    ? 'Your squad does not meet the minimum member requirement to unlock arena challenges.'
                    : isStaff
                      ? challenges.length === 0
                        ? `The arena "${eventInfo?.name || 'Event'}" currently has no challenges assigned. You can create, assign, and manage challenges in Challenges HQ.`
                        : 'Try selecting a different category or clearing your search query.'
                      : eventInfo?.name
                        ? `There are currently no active challenges in the arena "${eventInfo.name}". Please wait for organizer announcements.`
                        : 'Try selecting a different category or clearing your search query.'}
            </p>
          </div>
          {isStaff && challenges.length === 0 && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link to="/hq/challenges">
                <Button className="gap-2 bg-primary text-black font-bold text-xs h-9">
                  <PlusCircle className="h-4 w-4" /> Open Challenges HQ
                </Button>
              </Link>
              <Link to="/hq/events">
                <Button variant="outline" className="gap-2 text-xs h-9 font-mono">
                  <Layers className="h-4 w-4" /> Manage Events in Admin HQ
                </Button>
              </Link>
            </div>
          )}
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
              <Key className="h-5 w-5" /> Verify Access Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the unique Access Token provided by the organizers to unlock the arena and your CTF challenge list.
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
                Cancel
              </Button>
              <Button type="submit" disabled={tokenSubmitting || !inputToken.trim()} className="gap-2">
                {tokenSubmitting ? (
                  'Verifying...'
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Activate Token</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* SQUAD PERFORMANCE DETAIL MODAL */}
      {teamInfo && (
        <TeamDetailModal
          teamId={teamInfo.id}
          open={inspectTeamModalOpen}
          onOpenChange={setInspectTeamModalOpen}
        />
      )}

      {/* EVENT STATS & PERFORMANCE MODAL */}
      <EventDetailModal
        eventId={eventInfo?.id || selectedEventId || 'active'}
        open={inspectEventModalOpen}
        onOpenChange={setInspectEventModalOpen}
      />
    </div>
  );
};

