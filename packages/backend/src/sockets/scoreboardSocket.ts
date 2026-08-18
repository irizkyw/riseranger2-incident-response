import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import prisma from '../config/db.js';
import redis from '../config/redis.js';
import { calculateSolvePoints, EventScoringRules } from '../utils/scoring.js';
import { isOriginAllowed } from '../config/cors.js';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join-event', (eventId: string) => {
      socket.join(`event_${eventId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room event_${eventId}`);
    });

    socket.on('join-event-room', (eventId: string) => {
      socket.join(`event_${eventId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room event_${eventId}`);
      sendScoreboardToClient(socket, eventId);
    });

    socket.on('leave-event-room', (eventId: string) => {
      socket.leave(`event_${eventId}`);
      console.log(`[Socket.IO] Client ${socket.id} left room event_${eventId}`);
    });

    socket.on('join-admin-room', () => {
      socket.join('admin_hq');
      console.log(`[Socket.IO] Admin client ${socket.id} joined room admin_hq`);
    });

    socket.on('join-user-session', (userId: string) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket.IO] User ${userId} joined session room user_${userId}`);
      }
    });

    socket.on('request-sync', (eventId: string) => {
      if (eventId) sendScoreboardToClient(socket, eventId);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Anti-Cheat: Terminate previous active browser session when a new login occurs
export const notifyMultipleLoginTerminated = (userId: string, newIp?: string) => {
  if (!io) return;
  io.to(`user_${userId}`).emit('force_logout', {
    code: 'MULTIPLE_LOGIN_DETECTED',
    message: 'Anti-Cheat Protection: Akun Anda baru saja login dari perangkat/browser lain. Sesi ini telah dihentikan secara otomatis.',
    new_ip: newIp,
    timestamp: new Date().toISOString()
  });
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

// Debounce map to prevent thundering herd / CPU spikes during simultaneous flag submissions
const broadcastTimers = new Map<string, NodeJS.Timeout>();

// Broadcast live scoreboard update to all connected clients in a specific event (debounced)
export const broadcastScoreboardUpdate = async (eventId: string, immediate: boolean = false) => {
  if (!io || !eventId) return;

  const executeBroadcast = async () => {
    try {
      // Invalidate cache to force fresh calculation
      try {
        await redis.del(`leaderboard:${eventId}`);
      } catch { }
      const leaderboard = await fetchLeaderboardData(eventId);
      if (io) {
        io.emit('scoreboard_update', leaderboard);
        io.to(`event_${eventId}`).emit('scoreboard_update', leaderboard);
      }
    } catch (err) {
      console.error('[Socket.IO] Error broadcasting scoreboard:', err);
    }
  };

  if (immediate) {
    if (broadcastTimers.has(eventId)) {
      clearTimeout(broadcastTimers.get(eventId)!);
      broadcastTimers.delete(eventId);
    }
    await executeBroadcast();
    return;
  }

  // Debounce 500ms to batch rapid simultaneous submissions
  if (broadcastTimers.has(eventId)) {
    clearTimeout(broadcastTimers.get(eventId)!);
  }

  const timer = setTimeout(async () => {
    broadcastTimers.delete(eventId);
    await executeBroadcast();
  }, 500);

  broadcastTimers.set(eventId, timer);
};

// Broadcast First Blood alert
export const broadcastFirstBlood = (eventId: string, data: { team_name: string; challenge_title: string; points: number }) => {
  if (!io) return;
  io.emit('first_blood_alert', data);
  io.to(`event_${eventId}`).emit('first_blood_alert', data);
};

// Broadcast 3D Boss Battle Attack Result
export const broadcastAttackResult = (eventId: string, data: {
  teamId: string;
  teamName: string;
  challengeId: string;
  challengeTitle?: string;
  success: boolean;
  isFirstBlood: boolean;
  pointsGained: number;
  newTotalScore: number;
  timestamp: string;
}) => {
  if (!io) return;
  io.emit('attack-result', data);
  io.to(`event_${eventId}`).emit('attack-result', data);
};

// Broadcast Live Challenge Activity (Peserta sedang mengerjakan tantangan & timer)
export const broadcastLiveActivity = (data: {
  type: 'SESSION_START' | 'HEARTBEAT' | 'SOLVED' | 'LEAVE' | 'FORCE_STOPPED' | 'PAUSED' | 'RESUMED';
  user_id: string;
  username: string;
  email?: string;
  team_id?: string | null;
  team_name?: string | null;
  challenge_id: string;
  challenge_title: string;
  category?: string;
  points?: number;
  event_id?: string | null;
  started_at: string;
  last_active_at: string;
  solved_at?: string | null;
  status: string;
  is_force_stopped?: boolean;
  is_paused?: boolean;
}) => {
  if (!io) return;
  io.emit('live_activity_update', data);
};

// Broadcast direct session control (force stop / pause / resume) to participant, team & admin with zero delay
export const broadcastSessionControl = (data: {
  action: 'FORCE_STOP' | 'UNLOCK' | 'PAUSE' | 'RESUME';
  attempt_id: string;
  user_id: string;
  team_id?: string | null;
  challenge_id: string;
  event_id?: string | null;
  is_force_stopped: boolean;
  is_paused: boolean;
  status: string;
  message: string;
}) => {
  if (!io) return;
  io.emit('session_control_update', data);
};

// Broadcast global event pause/resume to all participants with zero delay
export const broadcastEventPause = (eventId: string, isPaused: boolean, message?: string) => {
  if (!io) return;
  io.emit('event_pause_update', {
    eventId,
    is_paused: isPaused,
    message: message || (isPaused ? 'Kompetisi sedang di-pause oleh Panitia.' : 'Kompetisi telah dilanjutkan kembali!')
  });
};

// Broadcast global event force finish to all participants
export const broadcastEventFinished = (eventId: string, isFinished: boolean, message?: string) => {
  if (!io) return;
  io.emit('event_finished_update', {
    eventId,
    is_finished: isFinished,
    message: message || (isFinished ? '🏆 Event telah diselesaikan secara resmi ! Kompetisi telah berakhir.' : 'Arena event telah dibuka kembali.')
  });
  io.emit('event_pause_update', {
    eventId,
    is_paused: isFinished,
    is_finished: isFinished
  });
};

// Broadcast challenge visibility change to all clients so admins see updates without a refresh
export const broadcastChallengeVisibility = (data: {
  type: 'single' | 'bulk';
  challenge_id?: string;
  event_id?: string | null;
  category?: string | null;
  is_hidden: boolean;
  count?: number;
}) => {
  if (!io) return;
  io.emit('challenge_visibility_update', data);
  io.to('admin_hq').emit('challenge_visibility_update', data);
};

// Broadcast direct security / anti-cheat events in real-time
export const broadcastSecurityEvent = (data: any) => {
  if (!io) return;
  io.emit('security_event', data);
  io.to('admin_hq').emit('security_event', data);
};

// Broadcast Full Scoreboard Sync for 3D Boss Battle
export const broadcastScoreboardSync = async (eventId: string) => {
  if (!io) return;
  try {
    const totalChallenges = await prisma.challenge.count({ where: { is_active: true, event_id: eventId } });
    const solvedChallengesCount = await prisma.firstBlood.count();
    const sunHp = totalChallenges > 0 ? Math.max(0, Math.round(((totalChallenges - solvedChallengesCount) / totalChallenges) * 100)) : 100;

    const teams = await prisma.team.findMany({
      where: { is_banned: false, event_id: eventId },
      select: {
        id: true,
        name: true,
        score: true,
        color: true,
        submissions: {
          where: { is_correct: true },
          select: { challenge_id: true }
        }
      },
      orderBy: { score: 'desc' }
    });

    const formattedTeams = teams.map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      color: (t as any).color || '#00F0FF',
      solvedChallenges: t.submissions.map((s) => s.challenge_id)
    }));

    // Fetch recent 15 submissions (hits and misses) to populate live battle feed on refresh
    const recentSubmissions = await prisma.submission.findMany({
      where: { team: { event_id: eventId } },
      orderBy: { submitted_at: 'desc' },
      take: 15,
      include: {
        team: { select: { id: true, name: true, score: true } },
        challenge: { select: { id: true, title: true, points: true } }
      }
    });

    const firstBloods = await prisma.firstBlood.findMany({
      select: { challenge_id: true, team_id: true }
    });
    const fbSet = new Set(firstBloods.map(f => `${f.challenge_id}-${f.team_id}`));

    const recentAttacks = recentSubmissions.map((sub) => {
      const isFb = fbSet.has(`${sub.challenge_id}-${sub.team_id}`);
      return {
        id: sub.id,
        teamId: sub.team_id,
        teamName: sub.team.name,
        challengeId: sub.challenge_id,
        challengeTitle: sub.challenge.title,
        success: sub.is_correct,
        isFirstBlood: isFb && sub.is_correct,
        pointsGained: sub.is_correct ? (sub.challenge.points + (isFb ? 50 : 0)) : 0,
        newTotalScore: sub.team.score,
        timestamp: sub.submitted_at ? new Date(sub.submitted_at).toISOString() : new Date().toISOString()
      };
    });

    io.to(`event_${eventId}`).emit('scoreboard-sync', {
      teams: formattedTeams,
      sunHp,
      totalChallenges,
      recentAttacks
    });
    console.log('[Socket.IO] Broadcasted scoreboard-sync to all clients');
  } catch (err) {
    console.error('[Socket.IO] Error broadcasting scoreboard sync:', err);
  }
};

const sendScoreboardToClient = async (socket: any, eventId: string) => {
  try {
    const leaderboard = await fetchLeaderboardData(eventId);
    socket.emit('scoreboard_update', leaderboard);
    await broadcastScoreboardSync(eventId);
  } catch (err) {
    console.error('[Socket.IO] Error sending initial scoreboard:', err);
  }
};

export const fetchLeaderboardData = async (eventId: string) => {
  try {
    const cached = await redis.get(`leaderboard:${eventId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[Redis] Cache read error:', err);
  }

  // Fetch active teams, event rules, and unlocked hints
  const [teams, eventRow, unlockedHints] = await Promise.all([
    (prisma.team as any).findMany({
      where: { is_banned: false, event_id: eventId },
      select: {
        id: true,
        name: true,
        score: true,
        writeup_score: true,
        submissions: {
          where: { is_correct: true },
          orderBy: { submitted_at: 'desc' },
          select: {
            submitted_at: true,
            challenge: {
              select: {
                id: true,
                title: true,
                points: true,
                category: true,
                fb_bonus_override: true,
                fb_bonus_override_1st: true,
                fb_bonus_override_2nd: true,
                fb_bonus_override_3rd: true
              }
            }
          }
        }
      }
    }),
    (prisma.event as any).findUnique({
      where: { id: eventId },
      select: {
        enable_fb_bonus: true,
        fb_bonus_1st: true,
        fb_bonus_2nd: true,
        fb_bonus_3rd: true,
        solve_decay_pts: true
      }
    }),
    (prisma as any).unlockedHint.findMany({
      where: { event_id: eventId },
      select: { team_id: true, challenge_id: true, cost_deducted: true }
    }).catch(() => [])
  ]);

  // Map unlocked hints per team and per challenge
  const teamHintsCostMap = new Map<string, number>();
  const teamHintsCountMap = new Map<string, number>();
  const teamChalHintsMap = new Map<string, number>();

  for (const h of (unlockedHints || [])) {
    if (h.team_id) {
      teamHintsCostMap.set(h.team_id, (teamHintsCostMap.get(h.team_id) || 0) + (h.cost_deducted || 0));
      teamHintsCountMap.set(h.team_id, (teamHintsCountMap.get(h.team_id) || 0) + 1);
      if (h.challenge_id) {
        teamChalHintsMap.set(`${h.challenge_id}-${h.team_id}`, h.cost_deducted || 0);
      }
    }
  }

  // Determine solve rank / order per challenge (1st, 2nd, 3rd, 4th, 5th...)
  const allSolves = await prisma.submission.findMany({
    where: {
      is_correct: true,
      team: { is_banned: false, event_id: eventId }
    },
    orderBy: { submitted_at: 'asc' },
    select: { challenge_id: true, team_id: true }
  });

  const solveRankMap = new Map<string, number>();
  const solveCountPerChal = new Map<string, number>();

  for (const s of allSolves) {
    const key = `${s.challenge_id}-${s.team_id}`;
    if (!solveRankMap.has(key)) {
      const currentRank = (solveCountPerChal.get(s.challenge_id) || 0) + 1;
      solveCountPerChal.set(s.challenge_id, currentRank);
      solveRankMap.set(key, currentRank);
    }
  }

  // Event-level scoring rules (fallback)
  const eventRules: EventScoringRules = {
    enable_fb_bonus: eventRow?.enable_fb_bonus ?? true,
    fb_bonus_1st: eventRow?.fb_bonus_1st ?? 50,
    fb_bonus_2nd: eventRow?.fb_bonus_2nd ?? 25,
    fb_bonus_3rd: eventRow?.fb_bonus_3rd ?? 10,
    solve_decay_pts: eventRow?.solve_decay_pts ?? 5
  };

  const formatted = (teams as any[]).map((t: any) => {
    const solvedChallenges = (t.submissions as any[]).map((s: any) => {
      const key = `${s.challenge.id}-${t.id}`;
      const solveRank = solveRankMap.get(key) || 1;
      const hintCostDeducted = teamChalHintsMap.get(key) || 0;

      // Per-challenge override takes priority over event-level rules
      const chalRules: EventScoringRules = s.challenge.fb_bonus_override
        ? {
          enable_fb_bonus: true,
          fb_bonus_1st: s.challenge.fb_bonus_override_1st ?? 50,
          fb_bonus_2nd: s.challenge.fb_bonus_override_2nd ?? 25,
          fb_bonus_3rd: s.challenge.fb_bonus_override_3rd ?? 10,
          solve_decay_pts: eventRules.solve_decay_pts
        }
        : eventRules;

      const { totalPoints, bonusPoints, isFirstBlood } = calculateSolvePoints(s.challenge.points, solveRank, chalRules);

      return {
        id: s.challenge.id,
        title: s.challenge.title,
        points: totalPoints,
        base_points: s.challenge.points,
        bonus_points: bonusPoints,
        solve_rank: solveRank,
        category: s.challenge.category,
        is_first_blood: isFirstBlood,
        fb_bonus_override: s.challenge.fb_bonus_override || false,
        hint_cost_deducted: hintCostDeducted
      };
    });

    const flagPoints = solvedChallenges.reduce((acc: number, curr: any) => acc + curr.points, 0);
    const hintsCost = teamHintsCostMap.get(t.id) || 0;
    const writeupScore = t.writeup_score || 0;
    const computedTotalScore = Math.max(0, flagPoints - hintsCost + writeupScore);

    // Auto-heal / sync database team.score if out of sync with calculated solves & hints
    if (t.score !== computedTotalScore) {
      prisma.team.update({
        where: { id: t.id },
        data: { score: computedTotalScore }
      }).catch((err) => console.warn(`[Leaderboard] Auto-sync score failed for team ${t.id}:`, err));
    }

    return {
      id: t.id,
      name: t.name,
      score: computedTotalScore,
      flag_points: flagPoints,
      hints_cost_total: hintsCost,
      hints_used_count: teamHintsCountMap.get(t.id) || 0,
      writeup_score: writeupScore,
      solved_challenges: solvedChallenges,
      last_solve_at: (t.submissions as any[])[0]?.submitted_at ? new Date((t.submissions as any[])[0].submitted_at).getTime() : 0
    };
  });

  // Tie-breaker sort: highest score first; if equal, earliest last_solve_at first (ignoring 0 if no solves)
  formatted.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (a.last_solve_at === 0) return 1;
    if (b.last_solve_at === 0) return -1;
    return a.last_solve_at - b.last_solve_at;
  });

  const result = formatted.map((item, index) => ({
    rank: index + 1,
    id: item.id,
    name: item.name,
    score: item.score,
    flag_points: item.flag_points,
    hints_cost_total: item.hints_cost_total,
    hints_used_count: item.hints_used_count,
    writeup_score: item.writeup_score,
    solved_challenges: item.solved_challenges,
    last_solve_at: item.last_solve_at
  }));


  try {
    await redis.set(`leaderboard:${eventId}`, JSON.stringify(result), 'EX', 20);
  } catch (err) {
    console.warn('[Redis] Cache write error:', err);
  }

  return result;
};
