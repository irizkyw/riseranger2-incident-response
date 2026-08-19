import React, { useEffect, useState, useRef } from 'react';
import {
  Radio,
  Activity,
  Clock,
  Search,
  Download,
  RefreshCw,
  Users,
  Trophy,
  CheckCircle2,
  Timer,
  Play,
  Pause,
  ShieldAlert,
  Filter,
  Sparkles,
  Flame,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';
import { io, Socket } from 'socket.io-client';
import { formatWIBTime, formatWIBDate, formatWIBDateTime } from '@/utils/date';

// Helper to format seconds to HH:mm:ss
const formatDuration = (totalSeconds: number): string => {
  if (isNaN(totalSeconds) || totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Component for live ticking timer row
const LiveTimerCell: React.FC<{
  startedAt: string;
  solvedAt?: string | null;
  status: string;
  initialDuration?: number;
  isPaused?: boolean;
  isForceStopped?: boolean;
  pausedDurationSeconds?: number;
  pausedAt?: string | null;
}> = ({ startedAt, solvedAt, status, initialDuration = 0, isPaused, isForceStopped, pausedDurationSeconds = 0, pausedAt }) => {
  const [seconds, setSeconds] = useState<number>(initialDuration);

  useEffect(() => {
    const isFrozen = status === 'SOLVED' || status === 'FORCE_STOPPED' || status === 'PAUSED' || isPaused || isForceStopped;

    const compute = () => {
      if (!startedAt) return;
      const startMs = new Date(startedAt).getTime();
      const pausedSec = pausedDurationSeconds || 0;

      if (status === 'SOLVED' && solvedAt) {
        const solveMs = new Date(solvedAt).getTime();
        setSeconds(Math.max(0, Math.floor((solveMs - startMs) / 1000) - pausedSec));
        return;
      }

      if (isFrozen) {
        if (pausedAt) {
          const pauseMs = new Date(pausedAt).getTime();
          setSeconds(Math.max(0, Math.floor((pauseMs - startMs) / 1000) - pausedSec));
        } else {
          setSeconds(initialDuration);
        }
        return;
      }

      const nowMs = Date.now();
      const net = Math.max(0, Math.floor((nowMs - startMs) / 1000) - pausedSec);
      setSeconds(net);
    };

    compute();
    if (isFrozen) return;

    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [startedAt, solvedAt, status, initialDuration, isPaused, isForceStopped, pausedDurationSeconds, pausedAt]);

  if (status === 'SOLVED') {
    return (
      <div className="font-mono font-bold text-emerald-400 flex items-center justify-end gap-1.5 text-xs">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{formatDuration(seconds)}</span>
      </div>
    );
  }

  if (status === 'FORCE_STOPPED' || isForceStopped) {
    return (
      <div className="font-mono font-bold text-rose-400 flex items-center justify-end gap-1.5 text-xs">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span className="bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 text-rose-300">
          {formatDuration(seconds)} (LOCKED)
        </span>
      </div>
    );
  }

  if (status === 'PAUSED' || isPaused) {
    return (
      <div className="font-mono font-bold text-amber-400 flex items-center justify-end gap-1.5 text-xs">
        <Pause className="h-3.5 w-3.5" />
        <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 text-amber-300">
          {formatDuration(seconds)} (PAUSED)
        </span>
      </div>
    );
  }

  if (status === 'IN_PROGRESS') {
    return (
      <div className="font-mono font-bold text-cyan-400 flex items-center justify-end gap-1.5 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span className="tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30 text-cyan-300">
          {formatDuration(seconds)}
        </span>
      </div>
    );
  }

  // IDLE
  return (
    <div className="font-mono text-amber-400 flex items-center justify-end gap-1.5 text-xs font-semibold">
      <Clock className="h-3.5 w-3.5 text-amber-400/80" />
      <span>{formatDuration(seconds)}</span>
    </div>
  );
};

export const AdminLiveActivity: React.FC = () => {
  const [activities, setActivities] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    active_now: number;
    idle_count: number;
    paused_count?: number;
    force_stopped_count?: number;
    solved_count: number;
    total_sessions: number;
  }>({ active_now: 0, idle_count: 0, paused_count: 0, force_stopped_count: 0, solved_count: 0, total_sessions: 0 });

  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'IDLE' | 'PAUSED' | 'FORCE_STOPPED' | 'SOLVED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [eventsList, setEventsList] = useState<any[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [finishEventModal, setFinishEventModal] = useState<{ id: string; name: string; is_finished: boolean } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    badgeText: string;
    badgeColor: string;
    confirmText: string;
    confirmVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    confirmClassName?: string;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const socketRef = useRef<Socket | null>(null);
  const pollTimerRef = useRef<any>(null);
  const fetchDataRef = useRef<(showLoading?: boolean) => Promise<void>>(async () => { });

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const params: any = {};
      if (eventFilter !== 'ALL') params.event_id = eventFilter;

      const [res, evRes] = await Promise.all([
        api.get('/admin/live-activity', { params }),
        api.get('/admin/events')
      ]);

      if (res.data) {
        setActivities(res.data.activities || []);
        if (res.data.stats) setStats(res.data.stats);
      }
      if (evRes.data) {
        setEventsList(evRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch live activity:', err);
      if (showLoading) toast.error('Failed to load live challenge activity.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  useEffect(() => {
    fetchData(true);
  }, [eventFilter]);

  // Persistent Socket.IO connection
  useEffect(() => {
    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit('join-admin-room');
    };

    socket.on('connect', onConnect);
    if (socket.connected) onConnect();

    socket.on('live_activity_update', () => {
      fetchDataRef.current(false);
    });

    socket.on('session_control_update', () => {
      fetchDataRef.current(false);
    });

    socket.on('event_pause_update', () => {
      fetchDataRef.current(false);
    });

    socket.on('event_finished_update', () => {
      fetchDataRef.current(false);
    });

    socket.on('attack-result', () => {
      fetchDataRef.current(false);
    });

    socket.on('scoreboard_update', () => {
      fetchDataRef.current(false);
    });

    socket.on('security_event', () => {
      fetchDataRef.current(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      pollTimerRef.current = setInterval(() => {
        fetchData(false);
      }, 5000);
    } else {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoRefresh, eventFilter]);

  // Action: Toggle Force Stop
  const handleToggleForceStop = async (item: any) => {
    setActionLoadingId(item.id);
    const newForceStop = !item.is_force_stopped;
    setActivities(prev => prev.map(a => a.id === item.id ? {
      ...a,
      is_force_stopped: newForceStop,
      status: newForceStop ? 'FORCE_STOPPED' : (a.is_paused ? 'PAUSED' : 'IN_PROGRESS')
    } : a));

    try {
      await api.put(`/admin/live-activity/${item.id}/force-stop`, { is_force_stopped: newForceStop });
      toast.success(newForceStop ? `🛑 Progress for @${item.username} has been locked (Force Stopped)!` : `🔓 Progress for @${item.username} has been unlocked.`);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change force stop status');
      fetchData(false);
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmToggleForceStop = (item: any) => {
    const nextVal = !item.is_force_stopped;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Confirm Force Stop Operative' : 'Confirm Unlock Operative',
      description: nextVal
        ? `Are you sure you want to lock (Force Stop) challenge "${item.challenge_title}" for operative @${item.username}? The operative will not be able to submit flags until unlocked.`
        : `Are you sure you want to unlock challenge "${item.challenge_title}" for operative @${item.username}?`,
      badgeText: nextVal ? '🛑 FORCE STOP OPERATIVE' : '🔓 UNLOCK OPERATIVE',
      badgeColor: nextVal ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      confirmText: nextVal ? '🛑 Lock Operative Now' : '🔓 Unlock Operative',
      confirmVariant: nextVal ? 'destructive' : 'default',
      confirmClassName: nextVal ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
      onConfirm: () => handleToggleForceStop(item)
    });
  };

  // Action: Toggle Pause
  const handleTogglePause = async (item: any) => {
    setActionLoadingId(item.id);
    const newPause = !item.is_paused;
    setActivities(prev => prev.map(a => a.id === item.id ? {
      ...a,
      is_paused: newPause,
      status: newPause ? 'PAUSED' : (a.is_force_stopped ? 'FORCE_STOPPED' : 'IN_PROGRESS')
    } : a));

    try {
      await api.put(`/admin/live-activity/${item.id}/pause`, { is_paused: newPause });
      toast.success(newPause ? `Timer for @${item.username} paused!` : `Timer for @${item.username} resumed.`);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change pause status');
      fetchData(false);
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmTogglePause = (item: any) => {
    const nextVal = !item.is_paused;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Confirm Pause Operative Timer' : 'Confirm Resume Operative Timer',
      description: nextVal
        ? `Are you sure you want to pause the challenge stopwatch for "${item.challenge_title}" on operative @${item.username}?`
        : `Are you sure you want to resume the challenge stopwatch for "${item.challenge_title}" on operative @${item.username}?`,
      badgeText: nextVal ? 'PAUSE TIMER' : 'RESUME TIMER',
      badgeColor: nextVal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      confirmText: nextVal ? 'Pause Timer Now' : 'Resume Timer',
      confirmVariant: 'default',
      confirmClassName: nextVal ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : 'bg-cyan-500 hover:bg-cyan-600 text-black font-bold',
      onConfirm: () => handleTogglePause(item)
    });
  };

  // Action: Toggle Global Event Pause
  const handleToggleEventPause = async (event: any) => {
    const newPause = !(event as any).is_paused;
    setEventsList(prev => prev.map(e => e.id === event.id ? { ...e, is_paused: newPause } : e));
    setActivities(prev => prev.map(a => a.event_id === event.id ? { ...a, is_event_paused: newPause } : a));

    try {
      await api.put(`/admin/events/${event.id}/toggle-pause`, { is_paused: newPause });
      toast.success(newPause ? `Arena competition "${event.name}" paused successfully!` : `Arena competition "${event.name}" resumed successfully!`);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change event pause status');
      fetchData(false);
    }
  };

  const confirmToggleEventPause = (event: any) => {
    const nextVal = !event.is_paused;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Confirm Pause Arena Event' : 'Confirm Resume Arena Event',
      description: nextVal
        ? `Are you sure you want to pause all activities in arena "${event.name}"? All participant stopwatches will be frozen and flag submissions disabled.`
        : `Are you sure you want to resume arena competition "${event.name}" for all operatives?`,
      badgeText: nextVal ? 'PAUSE ARENA' : 'RESUME ARENA',
      badgeColor: nextVal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      confirmText: nextVal ? 'Pause Entire Arena' : 'Resume Arena',
      confirmVariant: 'default',
      confirmClassName: nextVal ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
      onConfirm: () => handleToggleEventPause(event)
    });
  };

  // Action: Force Finish Event
  const handleForceFinishEvent = async (id: string, isFinished: boolean) => {
    try {
      setEventsList(prev => prev.map(e => e.id === id ? { ...e, is_finished: isFinished, is_active: isFinished ? false : true } : e));
      await api.put(`/admin/events/${id}/force-finish`, { is_finished: isFinished });
      toast.success(isFinished ? '🏆 Arena event has officially concluded!' : 'Arena event has been reopened!');
      setFinishEventModal(null);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change event completion status');
      fetchData(false);
    }
  };

  const confirmReopenEvent = (event: any) => {
    setConfirmModal({
      open: true,
      title: 'Confirm Reopen Arena Event',
      description: `Are you sure you want to reopen arena "${event.name}"? Operatives will be able to continue challenges and submit flags.`,
      badgeText: '🔓 REOPEN ARENA',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      confirmText: 'Reopen Arena',
      confirmVariant: 'default',
      confirmClassName: 'bg-amber-500 hover:bg-amber-600 text-black font-bold',
      onConfirm: () => handleForceFinishEvent(event.id, false)
    });
  };

  // Action: Toggle Force Stop on whole Team
  const handleToggleForceStopTeam = async (teamId: string, teamName: string, currentlyStopped?: boolean) => {
    const nextVal = !currentlyStopped;
    setActivities(prev => prev.map(a => a.team_id === teamId ? {
      ...a,
      is_force_stopped: nextVal,
      status: nextVal ? 'FORCE_STOPPED' : (a.is_paused ? 'PAUSED' : 'IN_PROGRESS')
    } : a));

    try {
      await api.put(`/admin/teams/${teamId}/force-stop`, { is_force_stopped: nextVal });
      toast.success(nextVal ? `🛑 All members of Team "${teamName}" have been force stopped!` : `🔓 All members of Team "${teamName}" have been unlocked.`);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change team force stop status');
      fetchData(false);
    }
  };

  const confirmToggleForceStopTeam = (teamId: string, teamName: string, currentlyStopped?: boolean) => {
    const nextVal = !currentlyStopped;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Confirm Force Stop Entire Squad' : 'Confirm Unlock Squad',
      description: nextVal
        ? `Are you sure you want to FORCE STOP ALL members of Team "${teamName}" simultaneously? All team members will be unable to submit flags.`
        : `Are you sure you want to unlock challenge progress for all members of Squad "${teamName}"?`,
      badgeText: nextVal ? '🛑 FORCE STOP SQUAD' : '🔓 UNLOCK SQUAD',
      badgeColor: nextVal ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      confirmText: nextVal ? '🛑 Lock Entire Squad' : '🔓 Unlock Squad',
      confirmVariant: nextVal ? 'destructive' : 'default',
      confirmClassName: nextVal ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
      onConfirm: () => handleToggleForceStopTeam(teamId, teamName, currentlyStopped)
    });
  };

  // Action: Toggle Pause on whole Team
  const handleTogglePauseTeam = async (teamId: string, teamName: string, currentlyPaused?: boolean) => {
    const nextVal = !currentlyPaused;
    setActivities(prev => prev.map(a => a.team_id === teamId ? {
      ...a,
      is_paused: nextVal,
      status: nextVal ? 'PAUSED' : (a.is_force_stopped ? 'FORCE_STOPPED' : 'IN_PROGRESS')
    } : a));

    try {
      await api.put(`/admin/teams/${teamId}/pause`, { is_paused: nextVal });
      toast.success(nextVal ? `Timer for all members of Squad "${teamName}" paused!` : `Timer for all members of Squad "${teamName}" resumed.`);
      fetchData(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to change squad pause status');
      fetchData(false);
    }
  };

  const confirmTogglePauseTeam = (teamId: string, teamName: string, currentlyPaused?: boolean) => {
    const nextVal = !currentlyPaused;
    setConfirmModal({
      open: true,
      title: nextVal ? 'Confirm Pause Entire Squad Timer' : 'Confirm Resume Squad Timer',
      description: nextVal
        ? `Are you sure you want to pause the stopwatch for ALL members of Squad "${teamName}" simultaneously?`
        : `Are you sure you want to resume the stopwatch for all members of Squad "${teamName}"?`,
      badgeText: nextVal ? 'PAUSE SQUAD' : 'RESUME SQUAD',
      badgeColor: nextVal ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      confirmText: nextVal ? 'Pause Squad Timer' : 'Resume Squad Timer',
      confirmVariant: 'default',
      confirmClassName: nextVal ? 'bg-amber-500 hover:bg-amber-600 text-black font-bold' : 'bg-cyan-500 hover:bg-cyan-600 text-black font-bold',
      onConfirm: () => handleTogglePauseTeam(teamId, teamName, currentlyPaused)
    });
  };

  const activeSelectedEvent = eventFilter !== 'ALL' ? eventsList.find(e => e.id === eventFilter) : null;
  const categories = Array.from(new Set(activities.map(a => a.category).filter(Boolean)));

  const filtered = activities.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      a.username?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.team_name?.toLowerCase().includes(q) ||
      a.challenge_title?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q) ||
      a.event_name?.toLowerCase().includes(q);

    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchCategory = categoryFilter === 'ALL' || a.category === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const headers = ['User', 'Email', 'Team', 'Challenge', 'Category', 'Points', 'Status', 'Event', 'Started At', 'Duration Seconds', 'Duration Formatted', 'Wrong Attempts', 'Correct Solves'];
    const rows = filtered.map(a => [
      a.username,
      a.email,
      a.team_name,
      a.challenge_title,
      a.category,
      a.points,
      a.status,
      a.event_name,
      formatWIBDateTime(a.started_at),
      a.duration_seconds,
      formatDuration(a.duration_seconds),
      a.wrong_attempts,
      a.correct_attempts
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `live_activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export completed successfully!');
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase font-outfit flex items-center gap-2.5">
              Live Challenge Tracker & Timers
              <Badge variant="outline" className="font-mono font-bold">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping mr-2"></span>
                LIVE RADAR
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Monitor live challenges tackled by participants, live stopwatch timers, and control <strong>Force Stop</strong> and <strong>Pause Time</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onClick={() => setAutoRefresh(!autoRefresh)} className="text-xs gap-1.5 font-bold">
            {autoRefresh ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
            Auto-Refresh: {autoRefresh ? 'ON' : 'PAUSED'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-xs gap-1.5 border-border">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fetchData(true)} className="h-9 w-9 border border-border">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Global Event Pause & Finish Banner Control */}
      {activeSelectedEvent && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${activeSelectedEvent.is_finished
          ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
          : activeSelectedEvent.is_paused
            ? 'bg-amber-950/40 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
            : 'bg-gradient-to-r from-card to-card/90 border-border'
          }`}>
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${activeSelectedEvent.is_finished
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : activeSelectedEvent.is_paused
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                : 'bg-primary/10 text-primary border-primary/20'
              }`}>
              {activeSelectedEvent.is_finished ? <Trophy className="h-5 w-5 fill-current" /> : activeSelectedEvent.is_paused ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm font-outfit uppercase tracking-wider">
                  Arena: {activeSelectedEvent.name}
                </span>
                <Badge variant={activeSelectedEvent.is_finished ? 'outline' : activeSelectedEvent.is_paused ? 'destructive' : 'secondary'} className="font-mono font-bold">
                  {activeSelectedEvent.is_finished ? '🏆 ARENA CONCLUDED' : activeSelectedEvent.is_paused ? 'ARENA PAUSED' : 'ARENA ACTIVE'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSelectedEvent.is_finished
                  ? 'This arena competition has officially concluded. Submissions are disabled.'
                  : activeSelectedEvent.is_paused
                    ? 'All challenge timers and submission forms in this arena are currently frozen (Paused).'
                    : 'Arena competition is currently running normally.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Force Selesaikan / Buka Kembali */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFinishEventModal({
                  id: activeSelectedEvent.id,
                  name: activeSelectedEvent.name,
                  is_finished: !activeSelectedEvent.is_finished
                });
              }}
              className={`font-bold text-xs gap-1.5 shrink-0 ${activeSelectedEvent.is_finished
                ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10'
                }`}
            >
              {activeSelectedEvent.is_finished ? <RotateCcw className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
              <span>{activeSelectedEvent.is_finished ? 'Reopen Arena' : 'Force Conclude Arena'}</span>
            </Button>

            {/* Pause / Resume Arena */}
            <Button
              size="sm"
              onClick={() => confirmToggleEventPause(activeSelectedEvent)}
              disabled={activeSelectedEvent.is_finished}
              className={`font-bold text-xs gap-2 shrink-0 ${activeSelectedEvent.is_paused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
            >
              {activeSelectedEvent.is_paused ? (
                <> <Play className="h-4 w-4 fill-current" /> <span>RESUME ENTIRE ARENA</span> </>
              ) : (
                <> <Pause className="h-4 w-4" /> <span>PAUSE ENTIRE ARENA</span> </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 5 Real-time Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="bg-card/90 border-cyan-500/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider">In Progress</p>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{stats.active_now}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90 border-amber-500/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">Timers Paused</p>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{stats.paused_count || 0}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Pause className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90 border-rose-500/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-rose-400 tracking-wider">Force Stopped</p>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{stats.force_stopped_count || 0}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90 border-emerald-500/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">Challenges Solved</p>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{stats.solved_count}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/90 border-purple-500/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-purple-400 tracking-wider">Total Sessions</p>
              <h3 className="text-2xl font-black font-mono text-white mt-1">{stats.total_sessions}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center rounded-md border border-input bg-background p-0.5 text-xs">
            <button onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }} className={`px-3 py-1 rounded font-medium ${statusFilter === 'ALL' ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground'}`}>
              All ({activities.length})
            </button>
            <button onClick={() => { setStatusFilter('IN_PROGRESS'); setCurrentPage(1); }} className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 ${statusFilter === 'IN_PROGRESS' ? 'bg-cyan-600 text-white font-bold' : 'text-muted-foreground'}`}>
              In Progress ({stats.active_now})
            </button>
            <button onClick={() => { setStatusFilter('PAUSED'); setCurrentPage(1); }} className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 ${statusFilter === 'PAUSED' ? 'bg-amber-600 text-white font-bold' : 'text-muted-foreground'}`}>
              <Pause className="h-3 w-3" /> Paused ({stats.paused_count || 0})
            </button>
            <button onClick={() => { setStatusFilter('FORCE_STOPPED'); setCurrentPage(1); }} className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 ${statusFilter === 'FORCE_STOPPED' ? 'bg-rose-600 text-white font-bold' : 'text-muted-foreground'}`}>
              <ShieldAlert className="h-3 w-3" /> Force Stopped ({stats.force_stopped_count || 0})
            </button>
            <button onClick={() => { setStatusFilter('SOLVED'); setCurrentPage(1); }} className={`px-3 py-1 rounded font-medium ${statusFilter === 'SOLVED' ? 'bg-emerald-600 text-white font-bold' : 'text-muted-foreground'}`}>
              Solved ({stats.solved_count})
            </button>
          </div>

          {eventsList.length > 0 && (
            <select value={eventFilter} onChange={(e) => { setEventFilter(e.target.value); setCurrentPage(1); }} className="h-9 px-3 rounded-md bg-background border border-input text-xs">
              <option value="ALL">All Arena Events</option>
              {eventsList.map(ev => <option key={ev.id} value={ev.id}>{ev.name} {ev.is_paused ? '(PAUSED)' : ''}</option>)}
            </select>
          )}

          {categories.length > 0 && (
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }} className="h-9 px-3 rounded-md bg-background border border-input text-xs">
              <option value="ALL">All Categories</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search user, squad, challenge..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} className="pl-9 h-9 text-xs bg-background" />
        </div>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border">
                <TableHead className="w-[120px] font-bold text-xs uppercase font-outfit">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase font-outfit">Operative</TableHead>
                <TableHead className="font-bold text-xs uppercase font-outfit">Squad / Team</TableHead>
                <TableHead className="font-bold text-xs uppercase font-outfit">Target Challenge</TableHead>
                <TableHead className="font-bold text-xs uppercase font-outfit">Started At</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase font-outfit">Stopwatch Duration</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase font-outfit">Attempts</TableHead>
                <TableHead className="text-center font-bold text-xs uppercase font-outfit w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span>Scanning Live Participant Signals...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground font-mono">
                    <p className="text-sm font-semibold">No active participant activity found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((item) => (
                  <TableRow
                    key={item.id}
                    className={`border-border transition-colors ${item.status === 'FORCE_STOPPED'
                      ? 'bg-rose-500/[0.06] hover:bg-rose-500/[0.1]'
                      : item.status === 'PAUSED'
                        ? 'bg-amber-500/[0.06] hover:bg-amber-500/[0.1]'
                        : item.status === 'IN_PROGRESS'
                          ? 'bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08]'
                          : item.status === 'SOLVED'
                            ? 'bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]'
                            : 'hover:bg-muted/30'
                      }`}
                  >
                    {/* Status Badge */}
                    <TableCell>
                      {item.status === 'FORCE_STOPPED' && (
                        <Badge variant="outline" className="font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                          <ShieldAlert className="h-3 w-3 text-rose-400" />
                          Force Stop
                        </Badge>
                      )}
                      {item.status === 'PAUSED' && (
                        <Badge variant="outline" className="font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                          <Pause className="h-3 w-3 text-amber-400" />
                          Paused
                        </Badge>
                      )}
                      {item.status === 'IN_PROGRESS' && (
                        <Badge variant="outline" className="font-bold uppercase tracking-wider flex items-center gap-1.5 w-fit">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                          </span>
                          In Progress
                        </Badge>
                      )}
                      {item.status === 'IDLE' && (
                        <Badge variant="outline" className="font-semibold uppercase flex items-center gap-1.5 w-fit">
                          <Clock className="h-3 w-3 text-amber-400" />
                          Idle
                        </Badge>
                      )}
                      {item.status === 'SOLVED' && (
                        <Badge variant="outline" className="font-bold uppercase flex items-center gap-1.5 w-fit">
                          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                          Solved
                        </Badge>
                      )}
                    </TableCell>

                    {/* Participant (User) */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 ring-1 ring-border">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {(item.username || 'U').slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-bold text-foreground text-sm flex items-center gap-1.5">
                            <span>@{item.username}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{item.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Squad / Team */}
                    <TableCell>
                      <div className="flex items-center justify-between gap-2 max-w-[220px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: item.team_color || '#00F0FF' }}
                          />
                          <span className="font-bold text-foreground text-sm truncate" title={item.team_name}>
                            {item.team_name}
                          </span>
                        </div>
                        {item.team_id && (
                          <div className="flex items-center gap-0.5 shrink-0 bg-muted/60 p-0.5 rounded border border-border">
                            {/* Team Quick Force Stop */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmToggleForceStopTeam(item.team_id, item.team_name, item.is_force_stopped)}
                              className="h-5 w-5 text-muted-foreground hover:text-rose-400"
                              title={`[Squad Action] Force Stop all members of "${item.team_name}"`}
                            >
                              <ShieldAlert className="h-3 w-3" />
                            </Button>
                            {/* Team Quick Pause */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => confirmTogglePauseTeam(item.team_id, item.team_name, item.is_paused)}
                              className="h-5 w-5 text-muted-foreground hover:text-amber-400"
                              title={`[Squad Action] Pause/Resume timer for all members of "${item.team_name}"`}
                            >
                              <Pause className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                        {item.event_name}
                      </div>
                    </TableCell>

                    {/* Challenge Target */}
                    <TableCell>
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span>{item.challenge_title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="uppercase font-mono px-1.5 py-0">
                          {item.category}
                        </Badge>
                        <span className="text-[11px] font-mono font-black text-primary">
                          {item.points} PTS
                        </span>
                      </div>
                    </TableCell>

                    {/* Started At */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        <span className="font-semibold text-foreground/90">{formatWIBTime(item.started_at)}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {formatWIBDate(item.started_at)}
                      </div>
                    </TableCell>

                    {/* Live Stopwatch Duration */}
                    <TableCell className="text-right">
                      <LiveTimerCell
                        startedAt={item.started_at}
                        solvedAt={item.solved_at}
                        status={item.status}
                        initialDuration={item.duration_seconds}
                        isPaused={item.is_paused || item.is_event_paused}
                        isForceStopped={item.is_force_stopped}
                        pausedDurationSeconds={item.paused_duration_seconds}
                        pausedAt={item.paused_at}
                      />
                    </TableCell>

                    {/* Attempts */}
                    <TableCell className="text-center">
                      <div className="inline-flex items-center gap-1 font-mono text-xs">
                        <span className={`font-bold ${item.correct_attempts > 0 ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                          {item.correct_attempts}
                        </span>
                        <span className="text-muted-foreground/40">/</span>
                        <span className={`${item.wrong_attempts > 0 ? 'text-rose-400' : 'text-muted-foreground/50'}`}>
                          {item.wrong_attempts}
                        </span>
                      </div>
                      <div className="text-[9px] text-muted-foreground/60 uppercase">solves / missed</div>
                    </TableCell>

                    {/* Admin Actions */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Force Stop / Unlock Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirmToggleForceStop(item)}
                          disabled={actionLoadingId === item.id || item.status === 'SOLVED'}
                          title={item.is_force_stopped ? 'Unlock Operative Progress' : 'Force Stop & Lock Progress'}
                          className={`h-7 w-7 ${item.is_force_stopped
                            ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30'
                            : 'text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10'
                            }`}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" />
                          <span className="sr-only">{item.is_force_stopped ? 'Unlock' : 'Force Stop'}</span>
                        </Button>

                        {/* Pause / Resume Button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => confirmTogglePause(item)}
                          disabled={actionLoadingId === item.id || item.status === 'SOLVED' || item.is_force_stopped}
                          title={item.is_paused ? 'Resume Operative Timer' : 'Pause Operative Timer'}
                          className={`h-7 w-7 ${item.is_paused
                            ? 'text-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30'
                            : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10'
                            }`}
                        >
                          {item.is_paused ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                          <span className="sr-only">{item.is_paused ? 'Resume' : 'Pause'}</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </Card>

      {/* Universal Action Confirmation Modal */}
      <Dialog open={Boolean(confirmModal?.open)} onOpenChange={(open) => !open && setConfirmModal(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border shadow-2xl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={confirmModal?.badgeColor || 'bg-primary/20 text-primary border-primary/40'}>
                {confirmModal?.badgeText}
              </Badge>
            </div>
            <DialogTitle className="text-xl font-bold font-outfit uppercase tracking-wider text-foreground">
              {confirmModal?.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              {confirmModal?.description}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmModal(null)}
              className="border-border hover:bg-muted text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              variant={confirmModal?.confirmVariant || 'default'}
              className={confirmModal?.confirmClassName}
              onClick={async () => {
                if (confirmModal?.onConfirm) {
                  await confirmModal.onConfirm();
                }
                setConfirmModal(null);
              }}
            >
              {confirmModal?.confirmText || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Force Finish / Reopen Event Confirmation Modal */}
      <Dialog open={!!finishEventModal} onOpenChange={(open) => !open && setFinishEventModal(null)}>
        <DialogContent className={`sm:max-w-md ${finishEventModal?.is_finished ? 'border-amber-500/40' : 'border-emerald-500/40'}`}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 font-outfit uppercase tracking-wider ${finishEventModal?.is_finished ? 'text-amber-400' : 'text-emerald-400'}`}>
              {finishEventModal?.is_finished ? (
                <>
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Force Conclude Arena Event
                </>
              ) : (
                <>
                  <RotateCcw className="h-5 w-5 text-emerald-400" />
                  Reopen & Resume Arena Event
                </>
              )}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-foreground/80 text-xs">
              <p>
                {finishEventModal?.is_finished
                  ? <>Are you sure you want to conclude the arena competition <strong>"{finishEventModal?.name}"</strong> now?</>
                  : <>Are you sure you want to reopen and resume the arena competition <strong>"{finishEventModal?.name}"</strong>?</>}
              </p>
              {finishEventModal?.is_finished ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-mono space-y-1">
                  <p><strong>Impact of Concluding Event:</strong></p>
                  <p>• All operative active sessions will be terminated immediately.</p>
                  <p>• Flag submission forms will be permanently locked.</p>
                  <p>• The final scoreboard will be frozen as the conclusive standings.</p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono space-y-1">
                  <p>⚡ <strong>Impact of Reopening Event:</strong></p>
                  <p>• Operative challenge sessions will be reactivated.</p>
                  <p>• Challenge flag submission forms will be reopened.</p>
                  <p>• Live scoreboard will resume receiving real-time score updates.</p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishEventModal(null)}>Cancel</Button>
            <Button
              className={`text-white font-bold gap-1.5 ${finishEventModal?.is_finished ? 'bg-amber-600 hover:bg-amber-700 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}
              onClick={() => finishEventModal && handleForceFinishEvent(finishEventModal.id, finishEventModal.is_finished)}
            >
              {finishEventModal?.is_finished ? (
                <>
                  <Trophy className="h-4 w-4 fill-current" />
                  Conclude Event Now
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Reopen & Resume Event
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
