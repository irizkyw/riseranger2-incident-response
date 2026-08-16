import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Shield, Trophy, ArrowLeft, Download, Lock, CheckCircle2, HelpCircle, Pause, ShieldAlert, Timer, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FlagSubmitForm } from '@/components/FlagSubmitForm';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { io, Socket } from 'socket.io-client';
import api from '@/services/api';

export const ChallengeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedHint, setUnlockedHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [requireMinMembers, setRequireMinMembers] = useState<{ min: number; current: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live Stopwatch Timer & Pause/Lock State
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [isForceStopped, setIsForceStopped] = useState<boolean>(false);
  const [isSessionPaused, setIsSessionPaused] = useState<boolean>(false);
  const [isEventPaused, setIsEventPaused] = useState<boolean>(false);
  const [isEventFinished, setIsEventFinished] = useState<boolean>(false);

  const timerRef = useRef<any>(null);
  const heartbeatRef = useRef<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const isPausedRef = useRef<boolean>(false);
  const eventIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const pausedDurationRef = useRef<number>(0);
  const pausedAtRef = useRef<string | null>(null);

  useEffect(() => {
    isPausedRef.current = Boolean(isSolved || isForceStopped || isSessionPaused || isEventPaused || isEventFinished);
  }, [isSolved, isForceStopped, isSessionPaused, isEventPaused, isEventFinished]);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();
  const isAdmin = Boolean(currentUser?.role && currentUser.role !== 'PARTICIPANT');

  const fetchDetail = async () => {
    setLoading(true);
    setErrorMessage(null);
    setRequireMinMembers(null);
    try {
      const res = await api.get(`/challenges/${id}`);
      setChallenge(res.data);
      if (res.data.event_id) eventIdRef.current = res.data.event_id;
      if (res.data.is_event_paused) setIsEventPaused(true);
      if (res.data.is_event_finished) setIsEventFinished(true);
      if (res.data.is_force_stopped) setIsForceStopped(true);
      if (res.data.is_session_paused) setIsSessionPaused(true);

      if (res.data.is_solved) setIsSolved(true);

      if (!isAdmin) {
        try {
          const sessionRes = await api.post(`/challenges/${id}/track-session`);
          if (sessionRes.data) {
            startedAtRef.current = sessionRes.data.started_at;
            pausedDurationRef.current = sessionRes.data.paused_duration_seconds || 0;
            pausedAtRef.current = sessionRes.data.paused_at || null;
            setElapsedSeconds(sessionRes.data.elapsed_seconds || 0);
            setStartedAt(sessionRes.data.started_at);
            if (sessionRes.data.is_solved) setIsSolved(true);
            if (sessionRes.data.is_force_stopped) setIsForceStopped(true);
            if (sessionRes.data.is_paused) setIsSessionPaused(true);
          }
        } catch (sessErr) {
          console.warn('Session tracking error:', sessErr);
        }
      }
    } catch (err: any) {
      const errData = err.response?.data;
      if (errData?.require_min_members) {
        setRequireMinMembers({ min: errData.min_team_size, current: errData.current_team_size });
        setErrorMessage(errData.error);
      } else if (errData?.error) {
        setErrorMessage(errData.error);
      } else {
        toast.error('Failed to load challenge details');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDetail();
      const socket = io(window.location.origin, { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('session_control_update', (data: any) => {
        const matchesChallenge = !data.challenge_id || data.challenge_id === id;
        const matchesUser = !data.user_id || !currentUser?.id || data.user_id === currentUser?.id || (currentUser?.team_id && data.team_id === currentUser.team_id);

        if (matchesChallenge && matchesUser) {
          const action = data.action;
          if (action === 'FORCE_STOP') {
            setIsForceStopped(true);
            setIsSessionPaused(false);
            if (data.elapsed_seconds !== undefined) setElapsedSeconds(data.elapsed_seconds);
            toast.error(data.message || '🔒 Pengerjaan tantangan ini telah dihentikan secara paksa oleh Admin (Force Stopped).');
          } else if (action === 'UN_FORCE_STOP') {
            setIsForceStopped(false);
            if (data.elapsed_seconds !== undefined) setElapsedSeconds(data.elapsed_seconds);
            toast.success(data.message || '🔓 Kunci akses tantangan telah dibuka kembali oleh Admin.');
          } else if (action === 'PAUSE') {
            setIsSessionPaused(true);
            if (data.elapsed_seconds !== undefined) setElapsedSeconds(data.elapsed_seconds);
            toast.warning(data.message || '⏸️ Timer pengerjaan tantangan Anda sedang di-pause oleh Admin.');
          } else if (action === 'RESUME') {
            setIsSessionPaused(false);
            if (data.elapsed_seconds !== undefined) setElapsedSeconds(data.elapsed_seconds);
            toast.success(data.message || '▶️ Timer pengerjaan tantangan telah dilanjutkan kembali oleh Admin.');
          } else if (action === 'RESET_TIME') {
            setElapsedSeconds(0);
            startedAtRef.current = new Date().toISOString();
            setStartedAt(startedAtRef.current);
            pausedDurationRef.current = 0;
            pausedAtRef.current = null;
            toast.info(data.message || '⏱️ Stopwatch pengerjaan telah direset kembali ke 0 detik oleh Admin.');
          }
        }
      });

      socket.on('event_pause_update', (data: any) => {
        const isPaused = Boolean(data.is_paused ?? data.isPaused);
        setIsEventPaused(isPaused);
        if (isPaused) {
          toast.warning(data.message || '⏸️ Seluruh kompetisi arena sedang di-pause oleh Panitia.');
        } else {
          toast.success(data.message || '▶️ Kompetisi arena telah dilanjutkan kembali!');
        }
      });

      socket.on('event_finished_update', (data: any) => {
        const isFinished = Boolean(data.is_finished);
        setIsEventFinished(isFinished);
        if (isFinished) {
          toast.error(data.message || '🏆 Event telah diselesaikan secara resmi oleh Panitia!');
        } else {
          toast.success(data.message || 'Arena event telah dibuka kembali!');
        }
      });

      return () => { socket.disconnect(); };
    }
  }, [id]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      if (!startedAtRef.current) return;
      const startTime = new Date(startedAtRef.current).getTime();
      const nowTime = new Date().getTime();
      const totalElapsedMs = nowTime - startTime;
      const netSeconds = Math.max(0, Math.floor(totalElapsedMs / 1000) - (pausedDurationRef.current || 0));
      setElapsedSeconds(netSeconds);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = setInterval(() => {
      if (id && !isSolved && !isForceStopped && !isSessionPaused && !isEventPaused && !isEventFinished && !isAdmin) {
        api.post(`/challenges/${id}/heartbeat`).then((res) => {
          if (res.data?.status === 'FORCE_STOPPED') setIsForceStopped(true);
          else if (res.data?.status === 'PAUSED') setIsSessionPaused(true);
        }).catch(() => { });
      }
    }, 5000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [id, isSolved, isForceStopped, isSessionPaused, isEventPaused, isEventFinished, isAdmin]);

  const handleUnlockHint = async () => {
    setHintLoading(true);
    try {
      const res = await api.post(`/challenges/${id}/hint`);
      setUnlockedHint(res.data.hint);
      toast.success(res.data.message || 'Hint unlocked successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unlock hint');
    } finally {
      setHintLoading(false);
    }
  };

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse space-y-6"><div className="h-6 w-32 bg-muted rounded" /><div className="h-96 bg-card rounded-xl border" /></div>;
  }

  if (errorMessage) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-6">
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 shadow-sm space-y-4">
          <div className="h-14 w-14 mx-auto rounded-full bg-destructive/20 text-destructive flex items-center justify-center"><Lock className="h-7 w-7" /></div>
          <h2 className="text-xl font-bold text-foreground">Akses Tantangan Ditolak</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{errorMessage}</p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            {requireMinMembers ? <Link to="/team"><Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">Kelola Anggota Tim</Button></Link> : null}
            <Link to="/dashboard"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Arena</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card/60 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-sm">
        <Link to="/dashboard"><Button variant="outline" size="sm" className="gap-2 border-white/20"><ArrowLeft className="h-4 w-4 text-primary" /> Back to Challenges</Button></Link>
      </div>

      <Card className="border-cyber-cyan/50 bg-black/60 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex items-center gap-3"><Badge variant="secondary">{challenge.category}</Badge><span className="font-mono text-xl font-black text-primary">{challenge.points} PTS</span></div>
          <CardTitle className="mt-4 text-3xl font-black text-white">{challenge.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {isEventFinished && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3.5"><Trophy className="h-5 w-5 text-amber-300" /><div><h4 className="text-sm font-bold text-amber-300 uppercase">Kompetisi Arena Telah Selesai</h4></div></div>
          )}

          <div className="prose prose-invert max-w-none font-mono text-slate-300 whitespace-pre-wrap bg-black/40 p-6 rounded-lg border border-white/5">{challenge.description}</div>

          {challenge.file_url && !challenge.is_locked && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20"><div className="flex items-center gap-2 font-mono text-sm"><Download className="h-4 w-4 text-primary" /> Files Available</div><a href={challenge.file_url} target="_blank" rel="noopener noreferrer"><Button variant="default" size="sm">Download</Button></a></div>
          )}

          {!challenge.is_locked && !isForceStopped && (
            <div className="pt-2">
              {isAdmin && challenge.hint ? (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-outfit"><HelpCircle className="h-4 w-4" /> Challenge Hint (Preview Admin)</div>
                  <p className="font-mono text-sm text-amber-200/90 whitespace-pre-wrap">{challenge.hint}</p>
                </div>
              ) : unlockedHint ? (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-outfit"><HelpCircle className="h-4 w-4" /> Unlocked Hint (-{challenge.hint_cost} PTS)</div>
                  <p className="font-mono text-sm text-white">{unlockedHint}</p>
                </div>
              ) : !isAdmin ? (
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400"><HelpCircle className="mr-1.5 h-4 w-4" /> Request Hint</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Unlock Hint</DialogTitle></DialogHeader>
                    <DialogFooter><Button variant="destructive" onClick={handleUnlockHint} disabled={hintLoading}>{hintLoading ? 'Unlocking...' : 'Confirm'}</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>
          )}

          <div className="pt-6 border-t border-border/40">
            <h4 className="text-sm font-bold text-foreground uppercase mb-3">Submit Flag</h4>
            {isAdmin ? (
              <div className="p-4 rounded-xl bg-card/60 border border-white/10 flex items-center justify-center gap-2.5 text-xs text-muted-foreground font-mono">
                <Lock className="h-4 w-4 text-amber-400" />
                <span>Pengiriman flag dikunci untuk akun Administrator / Staff.</span>
              </div>
            ) : (
              <FlagSubmitForm
                challengeId={challenge.id}
                isSolved={isSolved}
                disabled={Boolean(isForceStopped || isSessionPaused || isEventPaused || isEventFinished)}
                onSuccess={() => setIsSolved(true)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
