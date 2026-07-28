import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import prisma from '../config/db.js';
import redis from '../config/redis.js';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join-event-room', (eventId: string) => {
      // Leave previous event rooms
      Array.from(socket.rooms).forEach(room => {
        if (room.startsWith('event_')) {
          socket.leave(room);
        }
      });
      socket.join(`event_${eventId}`);
      console.log(`[Socket.IO] Client ${socket.id} joined room event_${eventId}`);
      sendScoreboardToClient(socket, eventId);
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

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

// Broadcast live scoreboard update to all connected clients in a specific event
export const broadcastScoreboardUpdate = async (eventId: string) => {
  if (!io) return;
  try {
    const leaderboard = await fetchLeaderboardData(eventId);
    io.to(`event_${eventId}`).emit('scoreboard_update', leaderboard);
    console.log(`[Socket.IO] Broadcasted scoreboard_update to room event_${eventId}`);
  } catch (err) {
    console.error('[Socket.IO] Error broadcasting scoreboard:', err);
  }
};

// Broadcast First Blood alert
export const broadcastFirstBlood = (eventId: string, data: { team_name: string; challenge_title: string; points: number }) => {
  if (!io) return;
  io.to(`event_${eventId}`).emit('first_blood_alert', data);
  console.log(`[Socket.IO] First Blood Alert: Team ${data.team_name} solved ${data.challenge_title}`);
};

// Broadcast 3D Boss Battle Attack Result
export const broadcastAttackResult = (eventId: string, data: {
  teamId: string;
  teamName: string;
  challengeId: string;
  success: boolean;
  isFirstBlood: boolean;
  pointsGained: number;
  newTotalScore: number;
  timestamp: string;
}) => {
  if (!io) return;
  io.to(`event_${eventId}`).emit('attack-result', data);
  console.log(`[Socket.IO] Attack Result [Event ${eventId}]: ${data.teamName} -> ${data.success ? 'HIT (+${data.pointsGained})' : 'MISS'}`);
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

  // Fetch active teams and sort by score DESC, tie-breaker by earliest latest solve timestamp
  const teams = await prisma.team.findMany({
    where: { is_banned: false, event_id: eventId },
    select: {
      id: true,
      name: true,
      score: true,
      submissions: {
        where: { is_correct: true },
        orderBy: { submitted_at: 'desc' },
        select: { 
          submitted_at: true,
          challenge: {
            select: { title: true, points: true, category: true }
          }
        }
      }
    }
  });

  const formatted = teams.map((t) => {
    const solvedChallenges = t.submissions.map(s => ({
      title: s.challenge.title,
      points: s.challenge.points,
      category: s.challenge.category
    }));

    return {
      id: t.id,
      name: t.name,
      score: t.score,
      solved_challenges: solvedChallenges,
      last_solve_at: t.submissions[0]?.submitted_at ? new Date(t.submissions[0].submitted_at).getTime() : 0
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
    solved_challenges: item.solved_challenges,
    last_solve_at: item.last_solve_at
  }));

  try {
    await redis.set(`leaderboard:${eventId}`, JSON.stringify(result), 'EX', 10);
  } catch (err) {
    console.warn('[Redis] Cache write error:', err);
  }

  return result;
};
