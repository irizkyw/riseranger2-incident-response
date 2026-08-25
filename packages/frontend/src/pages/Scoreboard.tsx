import React, { useEffect, useState, useRef, useMemo, Suspense } from 'react';
import PixelBlast from '@/components/ui/PixelBlast';
import { useNavigate } from 'react-router-dom';
import { Trophy, Activity, Users, Rocket, Table as TableIcon, Radio, Target, ArrowLeft, BarChart3, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ScoreboardTable, LeaderboardItem } from '@/components/ScoreboardTable';
import { ScoreChart } from '@/components/ScoreChart';
import { ScoreboardOverlay } from '@/components/scoreboard-3d/ScoreboardOverlay';
import { FreezeScreenOverlay } from '@/components/scoreboard-3d/FreezeScreenOverlay';
import { EventDetailModal } from '@/components/EventDetailModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Toaster } from '@/components/ui/sonner';
import audioSfx from '@/utils/audioSfx';
import socketService from '@/services/socket';
import api from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Lazy-load Three.js scene for performance
const Scene3D = React.lazy(() => import('@/components/scoreboard-3d/Scene'));

interface AttackEvent {
  id: string;
  teamId: string;
  teamName: string;
  challengeId?: string;
  challengeTitle?: string;
  success: boolean;
  isFirstBlood: boolean;
  shotsCount?: number;
  totalShots?: number;
  pointsGained: number;
  newTotalScore: number;
  timestamp: string;
}

export const Scoreboard: React.FC = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'3d' | '2d'>(() => {
    return (localStorage.getItem('scoreboard_view_mode') as '3d' | '2d') || '3d';
  });
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [inspectEventModalOpen, setInspectEventModalOpen] = useState(false);
  const [inspectTeamModalId, setInspectTeamModalId] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('WAITING');
  const isModalOpen = Boolean(inspectTeamModalId || inspectEventModalOpen);

  const currentUser = useMemo(() => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, []);

  const isStaff = useMemo(() => {
    const role = (currentUser?.role || '').toUpperCase();
    return ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'].includes(role);
  }, [currentUser]);

  const [adminMode, setAdminMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('scoreboard_admin_mode');
    return saved !== null ? saved === 'true' : isStaff;
  });

  const handleToggleAdminMode = (enabled: boolean) => {
    setAdminMode(enabled);
    localStorage.setItem('scoreboard_admin_mode', String(enabled));
    const token = localStorage.getItem('access_token');
    const socket = socketService.connect();
    if (enabled) {
      if (token) {
        socket.emit('join-admin-room', token);
      }
      toast.success('Admin Mode Active: viewing real-time unmasked hits and actual scores');
    } else {
      socket.emit('leave-admin-room');
      toast.info('Public View Active: viewing frozen public standings snapshot');
    }
    if (selectedEventId) {
      fetchScoreboard(selectedEventId, enabled);
      socket.emit('request-sync', selectedEventId);
    }
  };

  const handleBack = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (isStaff) {
      navigate('/hq');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    localStorage.setItem('scoreboard_event_id', id);

    // 🚀 Instant State Transition: clear previous event queue & immediately fetch new event
    setAttackLogs([]);
    setTeams3d([]);
    setCurrentAttack(null);
    setSelectedTeam(null);
    attackQueueRef.current = [];

    fetchScoreboard(id, adminMode);

    const socket = socketService.connect();
    socket.emit('leave-event-room');
    socket.emit('join-event-room', id);
    socket.emit('request-sync', id);
  };

  const handleToggleView = (mode: '3d' | '2d') => {
    setViewMode(mode);
    localStorage.setItem('scoreboard_view_mode', mode);
  };

  const getCachedScoreboard = (key: string, fallback: any) => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>(() => getCachedScoreboard('scoreboard_leaderboard', []));
  const [challengesList, setChallengesList] = useState<any[]>(() => getCachedScoreboard('scoreboard_challenges', []));
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);

  // 3D Space Battle State
  const [teams3d, setTeams3d] = useState<any[]>([]);
  const [sunHp, setSunHp] = useState<number>(100);
  const [totalChallenges, setTotalChallenges] = useState<number>(10);
  const [attackLogs, setAttackLogs] = useState<AttackEvent[]>([]);
  const [currentAttack, setCurrentAttack] = useState<AttackEvent | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const attackQueueRef = useRef<AttackEvent[]>([]);

  const fetchScoreboard = async (eventId: string, isAdmMode: boolean = adminMode) => {
    try {
      const modeParam = isStaff && isAdmMode ? '&mode=admin' : '&mode=public';
      const res = await api.get(`/scoreboard?event_id=${eventId}${modeParam}`);
      const lb = res.data.leaderboard || [];
      setLeaderboard(lb);
      setIsFrozen(Boolean(res.data.is_frozen));
      setChallengesList(res.data.challenges || []);
      if (res.data.sun_hp !== undefined) setSunHp(res.data.sun_hp);
      if (res.data.total_challenges !== undefined) setTotalChallenges(res.data.total_challenges);

      // 🚀 Instantly map leaderboard to 3D Orbiting Squad Planets!
      if (Array.isArray(lb)) {
        setTeams3d(lb.map((item: any) => ({
          id: item.team_id || item.id,
          name: item.team_name || item.name,
          score: item.score || 0,
          color: item.color || '#00F0FF',
          rank: item.rank || 1,
          solvedCount: item.solved_count || 0
        })));
      }

      try {
        sessionStorage.setItem('scoreboard_leaderboard', JSON.stringify(lb));
        sessionStorage.setItem('scoreboard_challenges', JSON.stringify(res.data.challenges || []));
      } catch { }
    } catch (err) {
      console.error('Failed to load scoreboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/scoreboard/events');
        setEvents(res.data);
        const savedEventId = localStorage.getItem('scoreboard_event_id');
        if (savedEventId && res.data.some((e: any) => e.id === savedEventId)) {
          setSelectedEventId(savedEventId);
        } else if (res.data.length > 0) {
          setSelectedEventId(res.data[0].id);
          localStorage.setItem('scoreboard_event_id', res.data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch events', err);
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const isFrozenRef = useRef(isFrozen);
  isFrozenRef.current = isFrozen;

  const adminModeRef = useRef(adminMode);
  adminModeRef.current = adminMode;

  const isStaffRef = useRef(isStaff);
  isStaffRef.current = isStaff;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const eventsRef = useRef<any[]>([]);
  eventsRef.current = events;

  useEffect(() => {
    if (!selectedEventId) return;

    // Reset state for new event
    setAttackLogs([]);
    setTeams3d([]);
    setCurrentAttack(null);
    setSelectedTeam(null);
    attackQueueRef.current = [];

    fetchScoreboard(selectedEventId);

    // Setup Dynamic Real-time Countdown Timer & Freeze Checker
    let intervalId: any = null;
    const updateTimer = () => {
      const currentEv = eventsRef.current.find(e => e.id === selectedEventId);
      if (!currentEv) return;

      const now = new Date().getTime();
      const start = currentEv.start_time ? new Date(currentEv.start_time).getTime() : null;
      const end = currentEv.end_time ? new Date(currentEv.end_time).getTime() : null;
      const freeze = currentEv.freeze_time ? new Date(currentEv.freeze_time).getTime() : null;

      // Real-time automatic freeze / unfreeze calculation
      const isNowFrozen = Boolean(currentEv.is_frozen || (freeze && now >= freeze));
      setIsFrozen((prev) => {
        if (prev !== isNowFrozen) {
          if (selectedEventId) {
            fetchScoreboard(selectedEventId);
            socketService.connect().emit('request-sync', selectedEventId);
          }
          return isNowFrozen;
        }
        return prev;
      });

      if (start && now < start) {
        const diff = start - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`STARTS IN: ${h}h ${m}m ${s}s`);
      } else if (end && now < end) {
        const diff = end - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdownText(`TIME REMAINING: ${h}h ${m}m ${s}s`);
      } else if (end && now >= end) {
        setCountdownText('EVENT ENDED');
      } else {
        setCountdownText('ONGOING');
      }
    };

    updateTimer();
    intervalId = setInterval(updateTimer, 1000);

    const socket = socketService.connect();

    const handleUpdate = (updatedLeaderboard: LeaderboardItem[]) => {
      setLeaderboard(updatedLeaderboard);
      if (Array.isArray(updatedLeaderboard)) {
        setTeams3d(updatedLeaderboard.map((item: any) => ({
          id: item.team_id || item.id,
          name: item.team_name || item.name,
          score: item.score || 0,
          color: item.color || '#00F0FF',
          rank: item.rank || 1,
          solvedCount: item.solved_challenges?.length || item.solved_count || 0
        })));
      }
    };

    const handleFreezeUpdate = (data: { eventId?: string; is_frozen: boolean }) => {
      if (!data.eventId || data.eventId === selectedEventId) {
        setIsFrozen(data.is_frozen);
        // Instant real-time resync when freezing or unfreezing with zero manual refresh needed!
        if (selectedEventId) {
          fetchScoreboard(selectedEventId);
          socket.emit('request-sync', selectedEventId);
        }
        if (data.is_frozen) {
          toast.info('❄️ Scoreboard is now FROZEN (Freeze Mode Active)!', {
            description: 'Public standings & live battle feed are locked. Challenge solving remains operational.',
            position: 'bottom-right'
          });
        } else {
          toast.success('☀️ Scoreboard has been un-frozen! Real-time standings restored.', {
            position: 'bottom-right'
          });
        }
      }
    };

    const handleEventUpdated = (updatedEv: any) => {
      setEvents(prev => prev.map(e => e.id === updatedEv.id ? { ...e, ...updatedEv } : e));
      if (updatedEv.id === selectedEventId) {
        const now = new Date().getTime();
        const freeze = updatedEv.freeze_time ? new Date(updatedEv.freeze_time).getTime() : null;
        const isNowFrozen = Boolean(updatedEv.is_frozen || (freeze && now >= freeze));
        setIsFrozen(isNowFrozen);
        fetchScoreboard(updatedEv.id);
        socket.emit('request-sync', updatedEv.id);
      }
    };

    const handleFirstBlood = (data: { team_name: string; challenge_title: string; points: number }) => {
      // In 2D view, play sound with the toast. In 3D view, Scene.tsx plays it synced with the laser explosion.
      if (viewModeRef.current === '2d') {
        audioSfx.playFirstBloodDota(data.team_name);
      }
      toast.info(`👑 FIRST BLOOD ALERT: Team "${data.team_name}" just solved "${data.challenge_title}" (+${data.points} PTS)!`, {
        duration: 8000,
        position: 'bottom-right'
      });
    };

    const handleScoreboardSync = (data: { teams: any[]; sunHp: number; totalChallenges: number; recentAttacks?: AttackEvent[] }) => {
      setTeams3d(data.teams || []);
      if (data.sunHp !== undefined) setSunHp(data.sunHp);
      if (data.totalChallenges !== undefined) setTotalChallenges(data.totalChallenges);
      if (data.recentAttacks) {
        setAttackLogs(data.recentAttacks);
      }
    };

    const handleAttackResult = (data: AttackEvent) => {
      const attackId = data.id || `${data.teamId}-${data.challengeId || ''}-${data.timestamp}`;
      const isEvidenceStep = Boolean((data as any).isEvidenceOnly || String(data.id || '').startsWith('ssh-'));

      // 🛡️ Freeze Mode & Evidence Step Guard for Battle Feed:
      // Real battle feed entries & telemetry audio blips are reserved for actual FLAG submissions on the website!
      // Intermediate SSH evidence answers ONLY fire visual 3D lasers in the arena.
      const isCurrentlyPublicFrozen = isFrozenRef.current && (!isStaffRef.current || !adminModeRef.current);
      if (isCurrentlyPublicFrozen) {
        return; // ❄️ Public view remains 100% frozen!
      }

      audioSfx.unlock();

      if (!isEvidenceStep) {
        audioSfx.playFeedBlip(data.success);
        if (data.success && !data.isFirstBlood && viewModeRef.current === '2d') {
          audioSfx.playPrimaSound();
          toast.success(`⚡ HIT CONFIRMED: Team "${data.teamName}" just solved "${data.challengeTitle}" (+${data.pointsGained} PTS)!`, {
            duration: 6000,
            position: 'bottom-right'
          });
        }
        setAttackLogs((prev) => {
          // Prevent duplicate insertion
          if (prev.some((a) => a.id === attackId || (a.teamId === data.teamId && a.challengeId === data.challengeId && Math.abs(new Date(a.timestamp).getTime() - new Date(data.timestamp).getTime()) < 3000))) {
            return prev;
          }
          const attackWithId = { ...data, id: attackId };
          return [attackWithId, ...prev].slice(0, 15);
        });
      }

      // 🚀 3D Space Battle Laser Strike: Fires the visual laser beam across the arena
      setCurrentAttack((prev) => {
        const attackWithId = {
          ...data,
          id: attackId,
          pointsGained: isEvidenceStep ? 0 : data.pointsGained,
          isFirstBlood: isEvidenceStep ? false : data.isFirstBlood
        };
        if (!prev) {
          return attackWithId;
        } else {
          if (!attackQueueRef.current.some((q) => q.id === attackId)) {
            attackQueueRef.current.push(attackWithId);
          }
          return prev;
        }
      });
    };

    socket.on('scoreboard_update', handleUpdate);
    socket.on('event_freeze_update', handleFreezeUpdate);
    socket.on('event_updated', handleEventUpdated);
    socket.on('first_blood_alert', handleFirstBlood);
    socket.on('scoreboard-sync', handleScoreboardSync);
    socket.on('attack-result', handleAttackResult);

    // If staff and adminMode is true, join admin room for live telemetry
    if (isStaff && adminMode) {
      const token = localStorage.getItem('access_token');
      if (token) {
        socket.emit('join-admin-room', token);
      }
    } else if (isStaff && !adminMode) {
      socket.emit('leave-admin-room');
    }

    // Join specific event room and request immediate sync
    socket.emit('join-event-room', selectedEventId);
    socket.emit('request-sync', selectedEventId);

    return () => {
      if (intervalId) clearInterval(intervalId);
      socket.off('scoreboard_update', handleUpdate);
      socket.off('event_freeze_update', handleFreezeUpdate);
      socket.off('event_updated', handleEventUpdated);
      socket.off('first_blood_alert', handleFirstBlood);
      socket.off('scoreboard-sync', handleScoreboardSync);
      socket.off('attack-result', handleAttackResult);
    };
  }, [selectedEventId, adminMode, isStaff]);

  const handleAttackComplete = () => {
    setCurrentAttack((prev) => {
      if (attackQueueRef.current.length > 0) {
        const next = attackQueueRef.current.shift()!;
        return next;
      }
      return null;
    });
  };

  const isPublicFrozen = isFrozen && (!isStaff || !adminMode);

  if (viewMode === '3d') {
    return (
      <div className="w-full h-[calc(100vh-3.5rem)] lg:h-screen relative overflow-hidden bg-black select-none">
        <Suspense
          fallback={
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-cyber-cyan gap-4">
              <Rocket className="h-12 w-12 animate-bounce text-cyber-cyan shadow-[0_0_20px_rgba(0,240,255,0.8)]" />
              <div className="font-outfit font-black text-lg tracking-widest animate-pulse">INITIALIZING SPACE BATTLE 3D ARENA...</div>
              <div className="text-xs font-mono text-muted-foreground">Loading shaders, starfields & planetary orbits</div>
            </div>
          }
        >
          <Scene3D
            teams={teams3d.length > 0 ? teams3d : leaderboard.map((l, idx) => ({ ...l, color: ['#00F0FF', '#00FF66', '#A855F7', '#FF007F', '#FACC15'][idx % 5] }))}
            sunHp={sunHp}
            totalChallenges={totalChallenges}
            currentAttack={currentAttack}
            onAttackComplete={handleAttackComplete}
            selectedTeam={selectedTeam}
            onSelectTeam={(t) => setSelectedTeam(t)}
            isModalOpen={isModalOpen}
            isFrozen={isPublicFrozen}
          />
        </Suspense>

        {/* ❄️ Cyber Frost / Ice Screen Glaze Overlay for Scoreboard Freeze */}
        <FreezeScreenOverlay isFrozen={isPublicFrozen} />

        {events.length > 0 && (
          <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-2">
            {events.length > 1 ? (
              <Select value={selectedEventId || ''} onValueChange={(val) => handleSelectEvent(val)}>
                <SelectTrigger className="h-8 text-xs font-mono font-bold bg-black/85 text-white border-white/30 backdrop-blur-md min-w-[260px] max-w-[400px] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <SelectValue placeholder="Select Event Arena" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[10005] max-w-[440px]">
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                      <span className="truncate font-bold">{e.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="px-3 py-1 font-bold max-w-[380px] truncate">
                <span className="truncate">{events[0]?.name}</span>
              </Badge>
            )}
          </div>
        )}

        <ScoreboardOverlay
          teams={teams3d.length > 0 ? teams3d : leaderboard.map((l, idx) => ({ ...l, color: ['#00F0FF', '#00FF66', '#A855F7', '#FF007F', '#FACC15'][idx % 5] }))}
          attackLogs={attackLogs}
          onToggleView={() => handleToggleView('2d')}
          onSelectTeam={(t) => setSelectedTeam(t)}
          selectedTeam={selectedTeam}
          onResetCamera={() => setSelectedTeam(null)}
          onBack={handleBack}
          countdownText={countdownText}
          inspectModalTeamId={inspectTeamModalId}
          onInspectModalChange={setInspectTeamModalId}
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={handleSelectEvent}
          isStaff={isStaff}
          adminMode={adminMode}
          onToggleAdminMode={handleToggleAdminMode}
          isFrozen={isPublicFrozen}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* ❄️ Cyber Frost / Ice Screen Glaze Overlay for Scoreboard Freeze in 2D View */}
      <FreezeScreenOverlay isFrozen={isPublicFrozen} />

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
        <PixelBlast
          variant="square"
          pixelSize={4}
          color="#1c74b3"
          patternScale={8}
          patternDensity={1}
          pixelSizeJitter={0.45}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={3}
          edgeFade={0.05}
          transparent
        />
      </div>
      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 sm:gap-6 border-b border-border/40 pb-5 sm:pb-6">
          <div className="space-y-2 sm:space-y-3 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="gap-1.5 text-xs border-border h-7 sm:h-8 font-bold bg-card hover:bg-accent hover:text-cyber-cyan"
              >
                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Back to Arena
              </Button>
              <div className="flex items-center gap-1.5 text-yellow-400 text-[11px] sm:text-xs font-bold uppercase tracking-wider font-outfit">
                <Trophy className="h-3.5 w-3.5" /> LIVE STANDINGS
              </div>
              {countdownText && countdownText !== 'WAITING' && (
                <Badge variant="outline" className="sm:text-xs px-2 py-0.5 font-mono font-bold whitespace-nowrap">
                  {countdownText}
                </Badge>
              )}

            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-outfit text-white tracking-wide">
              RISERANGER 2 SCOREBOARD
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {events.length > 0 && (
              events.length > 1 ? (
                <Select value={selectedEventId || ''} onValueChange={(val) => handleSelectEvent(val)}>
                  <SelectTrigger className="h-9 sm:h-10 text-xs font-mono font-bold bg-card border-border text-foreground w-full sm:w-auto sm:min-w-[260px] sm:max-w-[400px] shadow-sm">
                    <SelectValue placeholder="Select Event Arena" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[10005] max-w-[440px]">
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                        <span className="truncate font-bold">{e.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="outline" className="px-3 py-1 font-bold h-9 sm:h-10 flex items-center justify-center max-w-[380px] truncate">
                  <span className="truncate">{events[0]?.name}</span>
                </Badge>
              )
            )}

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              {/* 🛡️ Staff Admin Mode Toggle */}
              {isStaff && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAdminMode(!adminMode)}
                  className={cn(
                    "h-9 sm:h-10 px-3 text-xs font-bold font-mono transition-all duration-300 gap-1.5 shadow-sm whitespace-nowrap",
                    adminMode
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/60 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      : "bg-blue-500/15 text-blue-300 border-blue-500/40 hover:bg-blue-500/25"
                  )}
                >
                  {adminMode ? (
                    <>
                      <Eye className="h-3.5 w-3.5 text-amber-400" />
                      <span>ADMIN: LIVE</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5 text-blue-400" />
                      <span>PUBLIC VIEW</span>
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => setInspectEventModalOpen(true)}
                size="sm"
                className="flex items-center justify-center gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-black whitespace-nowrap h-9 sm:h-10 px-3 font-outfit font-bold text-xs sm:text-sm"
              >
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Analytics
              </Button>

              <Button
                variant="cyber"
                onClick={() => handleToggleView('3d')}
                size="sm"
                className="flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(0,240,255,0.4)] whitespace-nowrap h-9 sm:h-10 px-3 sm:px-4 font-outfit font-bold text-xs sm:text-sm"
              >
                <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Battle View
              </Button>
            </div>
          </div>
        </div>

        {/* Admin Mode Alert Banner during Freeze */}
        {isStaff && adminMode && isFrozen && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300 text-xs font-mono shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-200">ADMIN MODE ACTIVE:</strong> Public participants see the scoreboard & live battle as <strong>FROZEN</strong>. You are currently viewing actual real-time telemetry and scores without masking.
              </div>
            </div>
            <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shrink-0">
              👑 LIVE TELEMETRY OVERRIDE
            </Badge>
          </div>
        )}

        {/* Line Chart */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyber-cyan" /> Top Teams Score Progression
          </h2>
          <ScoreChart eventId={selectedEventId} adminMode={isStaff && adminMode} />
        </div>

        {/* Leaderboard Table */}
        <div className="space-y-3 pt-4">
          <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-cyber-purple" /> Global Rankings
          </h2>
          {loading ? (
            <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Leaderboard Standings...</div>
          ) : (
            <ScoreboardTable
              leaderboard={leaderboard}
              challenges={challengesList}
              isFrozen={isPublicFrozen}
              onRefresh={() => selectedEventId && fetchScoreboard(selectedEventId, adminMode)}
              loading={loading}
            />
          )}
        </div>

        {/* EVENT STATS & PERFORMANCE MODAL */}
        <EventDetailModal
          eventId={selectedEventId}
          open={inspectEventModalOpen}
          onOpenChange={setInspectEventModalOpen}
        />
      </div>
    </div>
  );
};
