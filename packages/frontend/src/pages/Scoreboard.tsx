import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Activity, Users, Rocket, Table as TableIcon, Radio, Target, ArrowLeft, BarChart3 } from 'lucide-react';
import { ScoreboardTable, LeaderboardItem } from '@/components/ScoreboardTable';
import { ScoreChart } from '@/components/ScoreChart';
import { ScoreboardOverlay } from '@/components/scoreboard-3d/ScoreboardOverlay';
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => {
    return localStorage.getItem('scoreboard_event_id') || null;
  });
  const [inspectEventModalOpen, setInspectEventModalOpen] = useState(false);
  const [inspectTeamModalId, setInspectTeamModalId] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>('WAITING');
  const isModalOpen = Boolean(inspectTeamModalId || inspectEventModalOpen);

  const handleBack = () => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role === 'ADMIN') {
      navigate('/hq');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSelectEvent = (id: string) => {
    setSelectedEventId(id);
    localStorage.setItem('scoreboard_event_id', id);
  };


  const handleToggleView = (mode: '3d' | '2d') => {
    setViewMode(mode);
    localStorage.setItem('scoreboard_view_mode', mode);
  };

  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [challengesList, setChallengesList] = useState<any[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [loading, setLoading] = useState(true);

  // 3D Space Battle State
  const [teams3d, setTeams3d] = useState<any[]>([]);
  const [sunHp, setSunHp] = useState<number>(100);
  const [totalChallenges, setTotalChallenges] = useState<number>(10);
  const [attackLogs, setAttackLogs] = useState<AttackEvent[]>([]);
  const [currentAttack, setCurrentAttack] = useState<AttackEvent | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  const attackQueueRef = useRef<AttackEvent[]>([]);

  const fetchScoreboard = async (eventId: string) => {
    try {
      const res = await api.get(`/scoreboard?event_id=${eventId}`);
      setLeaderboard(res.data.leaderboard);
      setIsFrozen(res.data.is_frozen);
      setChallengesList(res.data.challenges || []);
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

  useEffect(() => {
    if (!selectedEventId) return;

    // Reset state for new event
    setAttackLogs([]);
    setTeams3d([]);
    setCurrentAttack(null);
    setSelectedTeam(null);
    attackQueueRef.current = [];

    fetchScoreboard(selectedEventId);

    // Setup Countdown Timer
    const ev = events.find(e => e.id === selectedEventId);
    let intervalId: any = null;
    if (ev) {
      const updateTimer = () => {
        const now = new Date().getTime();
        const start = ev.start_time ? new Date(ev.start_time).getTime() : null;
        const end = ev.end_time ? new Date(ev.end_time).getTime() : null;

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
    }

    const socket = socketService.connect();

    const handleUpdate = (updatedLeaderboard: LeaderboardItem[]) => {
      setLeaderboard(updatedLeaderboard);
    };

    const handleFirstBlood = (data: { team_name: string; challenge_title: string; points: number }) => {
      toast.info(`👑 FIRST BLOOD ALERT: Team "${data.team_name}" just solved "${data.challenge_title}" (+${data.points} PTS)!`, {
        duration: 8000,
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
      const attackWithId = { ...data, id: `${data.teamId}-${Date.now()}-${Math.random()}` };
      setAttackLogs((prev) => [attackWithId, ...prev].slice(0, 15));

      setCurrentAttack((prev) => {
        if (!prev) {
          return attackWithId;
        } else {
          attackQueueRef.current.push(attackWithId);
          return prev;
        }
      });
    };

    socket.on('scoreboard_update', handleUpdate);
    socket.on('first_blood_alert', handleFirstBlood);
    socket.on('scoreboard-sync', handleScoreboardSync);
    socket.on('attack-result', handleAttackResult);

    // Join specific event room and request immediate sync
    socket.emit('join-event-room', selectedEventId);
    socket.emit('request-sync', selectedEventId);

    return () => {
      if (intervalId) clearInterval(intervalId);
      socket.off('scoreboard_update', handleUpdate);
      socket.off('first_blood_alert', handleFirstBlood);
      socket.off('scoreboard-sync', handleScoreboardSync);
      socket.off('attack-result', handleAttackResult);
    };
  }, [selectedEventId, events]);

  const handleAttackComplete = () => {
    setCurrentAttack((prev) => {
      if (attackQueueRef.current.length > 0) {
        const next = attackQueueRef.current.shift()!;
        return next;
      }
      return null;
    });
  };

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
          />
        </Suspense>

        {events.length > 0 && (
          <div className="hidden md:flex absolute top-4 left-1/2 -translate-x-1/2 z-30 items-center gap-2">
            {events.length > 1 ? (
              <Select value={selectedEventId || ''} onValueChange={(val) => handleSelectEvent(val)}>
                <SelectTrigger className="h-8 text-xs font-mono font-bold bg-black/85 text-white border-white/30 backdrop-blur-md min-w-[200px] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
                  <SelectValue placeholder="Select Event Arena" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[10005]">
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <span>{e.is_active ? '🟢' : '⏸️'}</span>
                        <span className="font-bold">{e.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="bg-black/70 text-white border-white/20 px-3 py-1 font-bold text-xs">
                {events[0]?.name}
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
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8 max-w-6xl">
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
              <Badge variant="outline" className="text-cyber-cyan border-cyber-cyan bg-cyber-cyan/10 text-[11px] sm:text-xs px-2 py-0.5 font-mono font-bold animate-pulse whitespace-nowrap">
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
                <SelectTrigger className="h-9 sm:h-10 text-xs font-mono font-bold bg-card border-border text-foreground w-full sm:min-w-[200px] shadow-sm">
                  <SelectValue placeholder="Select Event Arena" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[10005]">
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs font-mono">
                      <span className="flex items-center gap-1.5">
                        <span>{e.is_active ? '🟢' : '⏸️'}</span>
                        <span className="font-bold">{e.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className="bg-muted/40 text-foreground border-border px-3 py-1 font-bold text-xs h-9 sm:h-10 flex items-center justify-center">
                {events[0]?.name}
              </Badge>
            )
          )}

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setInspectEventModalOpen(true)}
              size="sm"
              className="flex items-center justify-center gap-1.5 border-primary/40 text-primary hover:bg-primary hover:text-black whitespace-nowrap h-9 sm:h-10 px-3 font-outfit font-bold text-xs sm:text-sm"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Analytics 📊
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

      {/* Line Chart */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold font-outfit text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyber-cyan" /> Top Teams Score Progression
        </h2>
        <ScoreChart eventId={selectedEventId} />
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
            isFrozen={isFrozen}
            onRefresh={() => selectedEventId && fetchScoreboard(selectedEventId)}
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
  );
};
