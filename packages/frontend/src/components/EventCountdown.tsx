import React, { useState, useEffect } from 'react';
import { Timer, Clock, Pause, Trophy, AlertCircle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EventCountdownProps {
  startTime?: string | null;
  endTime?: string | null;
  freezeTime?: string | null;
  isPaused?: boolean;
  isFinished?: boolean;
  eventName?: string | null;
  variant?: 'compact' | 'banner' | 'pill' | 'header';
  className?: string;
}

export const EventCountdown: React.FC<EventCountdownProps> = ({
  startTime,
  endTime,
  freezeTime,
  isPaused = false,
  isFinished = false,
  eventName,
  variant = 'compact',
  className = ''
}) => {
  const [timeString, setTimeString] = useState<string>('--:--:--');
  const [status, setStatus] = useState<'UPCOMING' | 'RUNNING' | 'FREEZED' | 'ENDED' | 'OPEN'>('OPEN');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);

  useEffect(() => {
    const calculateTime = () => {
      if (isFinished) {
        setStatus('ENDED');
        setTimeString('ENDED');
        return;
      }

      if (!endTime && !startTime) {
        setStatus('OPEN');
        setTimeString('OPEN ARENA');
        return;
      }

      const now = new Date().getTime();
      const startMs = startTime ? new Date(startTime).getTime() : null;
      const endMs = endTime ? new Date(endTime).getTime() : null;
      const freezeMs = freezeTime ? new Date(freezeTime).getTime() : null;

      // Belum mulai
      if (startMs && now < startMs) {
        setStatus('UPCOMING');
        const diff = Math.max(0, startMs - now);
        setTimeString(formatDiff(diff));
        return;
      }

      // Sedang berjalan
      if (endMs) {
        const diff = endMs - now;
        if (diff <= 0) {
          setStatus('ENDED');
          setTimeString('TIME UP');
          setIsUrgent(false);
          return;
        }

        // Cek apakah mendekati akhir (< 15 menit = 900,000 ms)
        setIsUrgent(diff <= 15 * 60 * 1000);

        if (freezeMs && now >= freezeMs) {
          setStatus('FREEZED');
        } else {
          setStatus('RUNNING');
        }

        setTimeString(formatDiff(diff));
      } else {
        setStatus('OPEN');
        setTimeString('UNLIMITED');
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, freezeTime, isFinished]);

  const formatDiff = (diffMs: number) => {
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (days > 0) {
      return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  // 1. Variant Header (Untuk di samping tombol Back to Challenges di ChallengeDetail)
  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg border font-mono transition-all ${
        isFinished || status === 'ENDED'
          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          : isPaused
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
          : isUrgent
          ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse'
          : 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_12px_rgba(0,240,255,0.1)]'
      } ${className}`}>
        <div className="flex items-center gap-1.5 text-xs font-bold shrink-0">
          {isFinished || status === 'ENDED' ? (
            <Trophy className="h-4 w-4 text-rose-400 shrink-0" />
          ) : isPaused ? (
            <Pause className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
          ) : (
            <Timer className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-red-400 animate-spin' : 'text-primary'}`} />
          )}
          <span className="uppercase text-[11px] tracking-wider text-muted-foreground font-semibold">
            {isFinished || status === 'ENDED'
              ? 'Event Status:'
              : isPaused
              ? 'Arena Status:'
              : status === 'UPCOMING'
              ? 'Starts In:'
              : 'Time Remaining:'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm font-black tracking-wider text-foreground font-mono">
            {isPaused ? 'PAUSED' : timeString}
          </span>
          {isPaused && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
              PAUSED
            </span>
          )}
          {status === 'FREEZED' && !isPaused && (
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold border border-cyan-500/30">
              FROZEN
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Variant Banner (Untuk Card di Dashboard)
  if (variant === 'banner') {
    return (
      <div className={`p-4 rounded-xl border font-mono transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isFinished || status === 'ENDED'
          ? 'bg-rose-950/20 border-rose-500/30'
          : isPaused
          ? 'bg-amber-950/25 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
          : isUrgent
          ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
          : 'bg-card/90 border-primary/25 shadow-sm'
      } ${className}`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${
            isFinished || status === 'ENDED'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : isPaused
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : isUrgent
              ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
              : 'bg-primary/10 border-primary/30 text-primary'
          }`}>
            {isFinished || status === 'ENDED' ? (
              <Trophy className="h-5 w-5" />
            ) : isPaused ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Timer className="h-5 w-5" />
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5">
              <span>{eventName || 'Event Arena Timer'}</span>
              {isUrgent && !isFinished && !isPaused && (
                <span className="text-red-400 font-extrabold animate-pulse flex items-center gap-1 text-[10px]">
                  <AlertCircle className="h-3 w-3" /> CLOSING SOON
                </span>
              )}
            </p>
            <p className="text-xs text-foreground/80 mt-0.5">
              {isFinished || status === 'ENDED'
                ? 'The competition arena has ended.'
                : isPaused
                ? 'Arena timer paused by organizers.'
                : status === 'UPCOMING'
                ? 'Countdown to arena opening.'
                : status === 'FREEZED'
                ? 'Scoreboard frozen (Freeze Time) until end of event.'
                : 'Time remaining to submit your flags.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className={`px-4 py-2 rounded-lg border text-center font-mono ${
            isFinished || status === 'ENDED'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : isPaused
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              : isUrgent
              ? 'bg-red-500/25 border-red-500/60 text-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
              : 'bg-primary/15 border-primary/40 text-primary shadow-[0_0_15px_rgba(0,240,255,0.15)]'
          }`}>
            <span className="text-lg sm:text-xl font-black tracking-widest block">
              {isPaused ? 'TIME PAUSED' : timeString}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground block">
              {isFinished || status === 'ENDED' ? 'STATUS' : status === 'UPCOMING' ? 'STARTS IN' : 'COUNTDOWN'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Variant Pill / Compact (Default)
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-xs transition-all ${
      isFinished || status === 'ENDED'
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        : isPaused
        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
        : isUrgent
        ? 'bg-red-500/20 border-red-500/40 text-red-300 animate-pulse'
        : 'bg-primary/10 border-primary/30 text-primary'
    } ${className}`}>
      {isFinished || status === 'ENDED' ? (
        <Trophy className="h-3.5 w-3.5" />
      ) : isPaused ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Timer className="h-3.5 w-3.5" />
      )}
      <span className="text-[11px] font-bold text-muted-foreground uppercase">
        {status === 'UPCOMING' ? 'Starts in:' : 'Ends in:'}
      </span>
      <strong className="font-mono text-xs font-black text-foreground">
        {isPaused ? 'PAUSED' : timeString}
      </strong>
    </div>
  );
};
