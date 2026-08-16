import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Shield, Trophy, ArrowLeft, Download, Lock, CheckCircle2, AlertCircle, HelpCircle, Users, Clock, Pause, ShieldAlert, Play, Globe, Cpu, FileCode, Terminal, Sparkles, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

  const fetchDetail = async () => {
    setLoading(true);
    setErrorMessage(null);
    setRequireMinMembers(null);
    try {
      const res = await api.get(`/challenges/${id}`);
      setChallenge(res.data);
      if (res.data.event_id) {
        eventIdRef.current = res.data.event_id;
        if (socketRef.current) {
          socketRef.current.emit('join-event', res.data.event_id);
          socketRef.current.emit('join-event-room', res.data.event_id);
        }
      }
      if (res.data.is_event_paused) setIsEventPaused(true);
      if (res.data.is_event_finished) setIsEventFinished(true);
      if (res.data.is_force_stopped) setIsForceStopped(true);
      if (res.data.is_session_paused) setIsSessionPaused(true);

      // Check if already solved
      try {
        const solvesRes = await api.get(`/challenges/${id}/solves`);
        if (solvesRes.data?.user_solved || solvesRes.data?.team_solved) {
          setIsSolved(true);
        }
      } catch (e) {}

      // Start / track working session
      try {
        const sessionRes = await api.post(`/challenges/${id}/track-session`);
        if (sessionRes.data) {
          startedAtRef.current = sessionRes.data.started_at;
          pausedDurationRef.current = sessionRes.data.paused_duration_seconds || 0;
          pausedAtRef.current = sessionRes.data.paused_at || null;
          setElapsedSeconds(sessionRes.data.elapsed_seconds || 0);
          setStartedAt(sessionRes.data.started_at);
          if (sessionRes.data.is_solved) {
            setIsSolved(true);
          }
          if (sessionRes.data.is_force_stopped) setIsForceStopped(true);
          if (sessionRes.data.is_paused) setIsSessionPaused(true);
          if (sessionRes.data.is_event_paused) setIsEventPaused(true);
          if (sessionRes.data.is_event_finished) setIsEventFinished(true);
        }
      } catch (sessErr) {
        console.warn('Session tracking error:', sessErr);
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

      // Connect to socket for instant zero-delay live control broadcasts
      const socketUrl = window.location.origin;
      const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        const evId = eventIdRef.current || currentUser?.event_id;
        if (evId) {
          socket.emit('join-event', evId);
          socket.emit('join-event-room', evId);
        }
      });

      if (currentUser?.event_id) {
        socket.emit('join-event', currentUser.event_id);
        socket.emit('join-event-room', currentUser.event_id);
      }

      socket.on('session_control_update', (data: any) => {
        const matchesChallenge = !data.challenge_id || data.challenge_id === id;
        const matchesUser = !data.user_id || !currentUser?.id || data.user_id === currentUser?.id || (currentUser?.team_id && data.team_id === currentUser.team_id);

        if (matchesChallenge && matchesUser) {
          if (data.action === 'FORCE_STOP' || data.is_force_stopped === true) {
            isPausedRef.current = true;
            setIsForceStopped(true);
            toast.error(data.message || '🔒 Pengerjaan tantangan ini telah dikunci oleh Admin.');
          } else if (data.action === 'UNLOCK' || data.is_force_stopped === false) {
            setIsForceStopped(false);
            isPausedRef.current = Boolean(isSessionPaused || isEventPaused || isEventFinished || isSolved);
            toast.success(data.message || '🔓 Kunci tantangan telah dibuka oleh Admin.');
          }

          if (data.action === 'PAUSE' || data.is_paused === true) {
            isPausedRef.current = true;
            setIsSessionPaused(true);
            toast.warning(data.message || '⏸️ Waktu pengerjaan tantangan sedang di-pause oleh Admin.');
          } else if (data.action === 'RESUME' || data.is_paused === false) {
            setIsSessionPaused(false);
            isPausedRef.current = Boolean(isForceStopped || isEventPaused || isEventFinished || isSolved);
            toast.info(data.message || '▶️ Waktu pengerjaan tantangan telah dilanjutkan.');
          }
        }
      });

      socket.on('event_pause_update', (data: any) => {
        const targetEventId = data.eventId || data.event_id;
        const curEventId = eventIdRef.current || currentUser?.event_id;
        const matchesEvent = !targetEventId || !curEventId || targetEventId === curEventId;

        if (matchesEvent) {
          const paused = Boolean(data.is_paused ?? data.isPaused);
          setIsEventPaused(paused);
          if (paused) {
            isPausedRef.current = true;
            toast.warning(data.message || '⏸️ Kompetisi arena sedang di-pause oleh Panitia.');
          } else {
            setIsSessionPaused(false);
            isPausedRef.current = Boolean(isForceStopped || isEventFinished || isSolved);
            toast.success(data.message || '▶️ Kompetisi arena telah dilanjutkan kembali!');
          }
        }
      });

      socket.on('event_finished_update', (data: any) => {
        const targetEventId = data.eventId || data.event_id;
        const curEventId = eventIdRef.current || currentUser?.event_id;
        const matchesEvent = !targetEventId || !curEventId || targetEventId === curEventId;

        if (matchesEvent) {
          const finished = Boolean(data.is_finished);
          setIsEventFinished(finished);
          if (finished) {
            isPausedRef.current = true;
            toast.error(data.message || '🏆 Event telah diselesaikan secara resmi oleh Panitia!');
          } else {
            isPausedRef.current = Boolean(isForceStopped || isSessionPaused || isEventPaused || isSolved);
            toast.success(data.message || 'Arena event telah dibuka kembali!');
          }
        }
      });

      // Start ticker timer every second (exact timestamp sync)
      timerRef.current = setInterval(() => {
        if (!isPausedRef.current && startedAtRef.current) {
          const startMs = new Date(startedAtRef.current).getTime();
          const nowMs = Date.now();
          const net = Math.max(0, Math.floor((nowMs - startMs) / 1000) - (pausedDurationRef.current || 0));
          setElapsedSeconds(net);
        }
      }, 1000);

      // Heartbeat every 15 seconds to synchronize elapsed time & status
      heartbeatRef.current = setInterval(() => {
        api.post(`/challenges/${id}/heartbeat`).then((res) => {
          if (res.data) {
            if (res.data.started_at) startedAtRef.current = res.data.started_at;
            if (res.data.paused_duration_seconds !== undefined) pausedDurationRef.current = res.data.paused_duration_seconds;
            if (res.data.paused_at !== undefined) pausedAtRef.current = res.data.paused_at;
            if (res.data.elapsed_seconds !== undefined && !isPausedRef.current) {
              setElapsedSeconds(res.data.elapsed_seconds);
            }
            if (res.data.is_force_stopped !== undefined) setIsForceStopped(res.data.is_force_stopped);
            if (res.data.is_paused !== undefined) setIsSessionPaused(res.data.is_paused);
            if (res.data.is_event_paused !== undefined) setIsEventPaused(res.data.is_event_paused);
          }
        }).catch(() => {});
      }, 15000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [id]);

  const isTimerFrozen = isSolved || isForceStopped || isSessionPaused || isEventPaused;

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const handleUnlockHint = async () => {
    setHintLoading(true);
    try {
      const res = await api.post(`/challenges/${id}/hint`);
      setUnlockedHint(res.data.hint);
      toast.success(`Hint unlocked! -${res.data.cost_deducted} points from your team.`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to unlock hint');
    } finally {
      setHintLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Challenge Specs...</div>;
  }

  if (errorMessage || !challenge) {
    return (
      <div className="container mx-auto p-12 text-center max-w-lg space-y-4">
        <div className="p-8 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Tantangan Tidak Dapat Diakses</h2>
          <p className="text-sm text-muted-foreground">
            {errorMessage || 'Tantangan tidak ditemukan atau arena sedang tidak aktif.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            {requireMinMembers ? (
              <Link to="/team">
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  Kelola Anggota Tim
                </Button>
              </Link>
            ) : null}
            <Link to="/dashboard">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Arena</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-cyber-cyan hover:underline font-outfit">
        <ArrowLeft className="h-4 w-4" /> BACK TO CHALLENGES
      </Link>

      <Card className="border-cyber-cyan/50 bg-black/60 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
        <CardHeader className="border-b border-border/40 pb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1 uppercase font-semibold">
                {challenge.category}
              </Badge>
              <span className="font-mono text-2xl font-black text-primary">{challenge.points} PTS</span>
              {challenge.is_locked && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold uppercase text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Locked Challenge
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isEventFinished ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Trophy className="h-3.5 w-3.5 text-amber-400" />
                  <span>EVENT SELESAI (FINAL: <span className="font-black text-white">{formatDuration(elapsedSeconds)}</span>)</span>
                </div>
              ) : isSolved ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> SOLVED (DURASI: {formatDuration(elapsedSeconds)})
                </div>
              ) : isForceStopped ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  <span>PENGERJAAN DIKUNCI (FORCE STOPPED): <span className="font-black text-white">{formatDuration(elapsedSeconds)}</span></span>
                </div>
              ) : isSessionPaused || isEventPaused ? (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono text-xs font-bold shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                  <span>TIMER DI-PAUSE: <span className="font-black text-white">{formatDuration(elapsedSeconds)}</span></span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse">
                  <Timer className="h-3.5 w-3.5 text-cyan-400" />
                  <span>DURASI PENGERJAAN: <span className="font-black text-white">{formatDuration(elapsedSeconds)}</span></span>
                </div>
              )}

              {challenge.first_blood && (
                <div className="flex items-center gap-1.5 rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-bold text-yellow-400 border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.3)] animate-pulse">
                  <Trophy className="h-4 w-4" /> First Blood: {challenge.first_blood.team.name}
                </div>
              )}
            </div>
          </div>

          <CardTitle className="mt-4 text-3xl font-black font-outfit text-white tracking-wide">
            {challenge.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Event Finished Alert Banner */}
          {isEventFinished && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3.5 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <Trophy className="h-5 w-5 fill-current" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wide">Kompetisi Arena Telah Selesai Secara Resmi</h4>
                <p className="text-xs text-amber-200/90 mt-1">
                  Panitia telah secara resmi menyelesaikan kompetisi arena ini. Seluruh pengiriman flag dinonaktifkan dan hasil akhir scoreboard telah dibekukan.
                </p>
              </div>
            </div>
          )}

          {/* Force Stopped Alert Banner */}
          {isForceStopped && !isEventFinished && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3.5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
              <div className="h-10 w-10 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-400 uppercase tracking-wide">Pengerjaan Dikunci oleh Admin (Force Stopped)</h4>
                <p className="text-xs text-rose-200/90 mt-1">
                  Sesi pengerjaan untuk tantangan ini telah dihentikan dan dikunci secara paksa oleh Admin. Anda tidak dapat melakukan pengiriman flag sampai Admin membuka kembali kunci akses tantangan ini.
                </p>
              </div>
            </div>
          )}

          {/* Paused Alert Banner */}
          {(isSessionPaused || isEventPaused) && !isForceStopped && !isEventFinished && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3.5 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <Pause className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
                  {isEventPaused ? 'Kompetisi Arena Sedang Di-Pause' : 'Waktu Pengerjaan Sedang Di-Pause oleh Admin'}
                </h4>
                <p className="text-xs text-amber-200/90 mt-1">
                  {isEventPaused
                    ? 'Seluruh kompetisi arena sedang dijeda sementara oleh Panitia. Timer dan pengiriman flag dibekukan hingga kompetisi dilanjutkan kembali.'
                    : 'Timer pengerjaan tantangan Anda sedang dijeda oleh Admin. Timer tidak bertambah selama status pause aktif.'}
                </p>
              </div>
            </div>
          )}

          {challenge.is_locked && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wide">Tantangan Ini Masih Terkunci</h4>
                <p className="text-xs text-amber-200/90 mt-1">
                  Event ini menggunakan mode <strong>Tantangan Berantai (Chained Mode)</strong>. Anda harus menyelesaikan tantangan <strong>"{challenge.unlocks_after_title || 'sebelumnya'}"</strong> di kategori {challenge.category} terlebih dahulu agar bisa membuka tantangan ini.
                </p>
              </div>
            </div>
          )}

          <div className={`prose prose-invert max-w-none font-mono text-slate-300 whitespace-pre-wrap bg-black/40 p-6 rounded-lg border border-white/5 leading-relaxed ${challenge.is_locked || isForceStopped ? 'opacity-50 select-none' : ''}`}>
            {challenge.description}
          </div>

          {challenge.file_url && !challenge.is_locked && !isForceStopped && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 font-mono text-sm text-foreground">
                <Download className="h-4 w-4 text-primary" />
                <span>Attachment / Challenge Files Available</span>
              </div>
              <a href={challenge.file_url} target="_blank" rel="noopener noreferrer">
                <Button variant="default" size="sm" className="font-bold">
                  Download Files
                </Button>
              </a>
            </div>
          )}

          {/* Hint Section */}
          {!challenge.is_locked && !isForceStopped && (
            <div className="pt-2">
              {unlockedHint ? (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase font-outfit">
                    <HelpCircle className="h-4 w-4" /> Unlocked Hint (-{challenge.hint_cost} PTS)
                  </div>
                  <p className="font-mono text-sm text-white">{unlockedHint}</p>
                </div>
              ) : (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10">
                      <HelpCircle className="mr-1.5 h-4 w-4" /> Request Hint (Cost: {challenge.hint_cost || 0} PTS)
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Unlock Challenge Hint</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to unlock the hint for this challenge? This will immediately deduct <strong className="text-amber-400">{challenge.hint_cost || 0} points</strong> from your team's score!
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="destructive" onClick={handleUnlockHint} disabled={hintLoading || isEventPaused || isSessionPaused}>
                        {hintLoading ? 'Unlocking...' : 'Confirm Unlock'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}

          {/* Submit Form */}
          <div className="pt-6 border-t border-border/40">
            <h4 className="text-sm font-bold text-foreground uppercase font-outfit mb-3">Submit Captured Flag</h4>
            {challenge.is_locked ? (
              <div className="p-4 rounded-lg bg-muted/40 border border-border text-center text-xs text-muted-foreground font-mono">
                🔒 Form pengiriman flag dinonaktifkan sampai tantangan sebelumnya selesai.
              </div>
            ) : (
              <FlagSubmitForm
                challengeId={challenge.id}
                isSolved={isSolved}
                disabled={Boolean(isForceStopped || isSessionPaused || isEventPaused || isEventFinished)}
                disabledMessage={
                  isEventFinished
                    ? '🏆 Kompetisi Event Telah Selesai'
                    : isForceStopped 
                    ? '🔒 Pengerjaan Dikunci oleh Admin (Force Stopped)' 
                    : (isSessionPaused || isEventPaused) 
                    ? '⏸️ Waktu Pengerjaan Sedang Di-Pause' 
                    : undefined
                }
                onSuccess={() => setIsSolved(true)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
