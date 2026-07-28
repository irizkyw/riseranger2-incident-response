import { Request, Response } from 'express';
import prisma from '../config/db.js';
import { fetchLeaderboardData } from '../sockets/scoreboardSocket.js';
import redis from '../config/redis.js';

export const getActiveEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      where: { is_active: true },
      select: { id: true, name: true, start_time: true, end_time: true, freeze_time: true }
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event_id } = req.query;
    if (!event_id || typeof event_id !== 'string') {
      res.status(400).json({ error: 'event_id query parameter is required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: event_id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const now = new Date();
    const isFrozen = event.is_frozen || (event.freeze_time && now > new Date(event.freeze_time));

    const leaderboard = await fetchLeaderboardData(event_id);

    res.json({
      is_frozen: !!isFrozen,
      leaderboard
    });
  } catch (err) {
    console.error('Scoreboard error:', err);
    res.status(500).json({ error: 'Failed to fetch scoreboard' });
  }
};

// Data for Recharts Line Chart (score progression over time)
export const getScoreProgressionChart = async (req: Request, res: Response): Promise<void> => {
  try {
    const { event_id } = req.query;
    if (!event_id || typeof event_id !== 'string') {
      res.status(400).json({ error: 'event_id query parameter is required' });
      return;
    }

    try {
      const cached = await redis.get(`chart:${event_id}`);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    } catch (err) {
      console.warn('[Redis] Cache read error:', err);
    }

    // Fetch top 10 teams
    const topTeams = await prisma.team.findMany({
      where: { is_banned: false, event_id: event_id },
      orderBy: { score: 'desc' },
      take: 10,
      select: { id: true, name: true }
    });

    const teamIds = topTeams.map(t => t.id);

    // Fetch all correct submissions for these teams ordered chronologically
    const solves = await prisma.submission.findMany({
      where: {
        team_id: { in: teamIds },
        is_correct: true
      },
      include: {
        challenge: { select: { points: true } },
        team: { select: { name: true } }
      },
      orderBy: { submitted_at: 'asc' }
    });

    // Build timeline data points
    const teamScores: Record<string, number> = {};
    topTeams.forEach(t => { teamScores[t.name] = 0; });

    const timeline: Array<{ timestamp: string; [teamName: string]: any }> = [
      { timestamp: 'Start', ...teamScores }
    ];

    solves.forEach(solve => {
      teamScores[solve.team.name] = (teamScores[solve.team.name] || 0) + solve.challenge.points;
      timeline.push({
        timestamp: new Date(solve.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...teamScores
      });
    });

    if (topTeams.length > 0) {
      timeline.push({
        timestamp: 'Now',
        ...teamScores
      });
    }

    const result = {
      teams: topTeams.map(t => t.name),
      timeline
    };

    try {
      await redis.set(`chart:${event_id}`, JSON.stringify(result), 'EX', 10);
    } catch (cacheErr) {
      console.error('Redis cache error:', cacheErr);
    }

    res.json(result);
  } catch (err) {
    console.error('Chart data error:', err);
    res.status(500).json({ error: 'Failed to fetch chart progression data' });
  }
};
