import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { broadcastScoreboardUpdate } from '../sockets/scoreboardSocket.ts';
import redis from '../config/redis.js';

export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count({ where: { role: 'PARTICIPANT' } });
    const totalTeams = await prisma.team.count();
    const totalChallenges = await prisma.challenge.count();
    const totalSubmissions = await prisma.submission.count();
    const correctSubmissions = await prisma.submission.count({ where: { is_correct: true } });

    // Solve rates per challenge
    const challenges = await prisma.challenge.findMany({
      select: {
        id: true,
        title: true,
        category: true,
        points: true,
        _count: {
          select: {
            submissions: true,
          }
        }
      }
    });

    const solveRates = await Promise.all(challenges.map(async (c) => {
      const solves = await prisma.submission.count({ where: { challenge_id: c.id, is_correct: true } });
      const totalSubs = c._count.submissions;
      const rate = totalSubs > 0 ? ((solves / totalSubs) * 100).toFixed(1) + '%' : '0%';
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        points: c.points,
        total_attempts: totalSubs,
        successful_solves: solves,
        solve_rate: rate
      };
    }));

    res.json({
      stats: {
        total_participants: totalUsers,
        total_teams: totalTeams,
        total_challenges: totalChallenges,
        total_submissions: totalSubmissions,
        correct_submissions: correctSubmissions,
        overall_accuracy: totalSubmissions > 0 ? ((correctSubmissions / totalSubmissions) * 100).toFixed(1) + '%' : '0%'
      },
      solve_rates: solveRates
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
};

export const getSubmissionLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = '50', is_correct, search } = req.query;
    const whereClause: any = {};
    if (is_correct !== undefined) {
      whereClause.is_correct = is_correct === 'true';
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      whereClause.OR = [
        { team: { name: { contains: search } } },
        { challenge: { title: { contains: search } } }
      ];
    }

    const logs = await prisma.submission.findMany({
      where: whereClause,
      take: Number(limit),
      orderBy: { submitted_at: 'desc' },
      include: {
        user: { select: { username: true, email: true } },
        team: { select: { name: true } },
        challenge: { select: { title: true, category: true, points: true } }
      }
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch submission logs' });
  }
};

export const getAllEvents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, join_token, start_time, end_time, freeze_time, is_frozen, is_active } = req.body;
    const newEvent = await prisma.event.create({
      data: {
        name,
        join_token,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        freeze_time: freeze_time ? new Date(freeze_time) : null,
        is_frozen: is_frozen !== undefined ? Boolean(is_frozen) : false,
        is_active: is_active !== undefined ? Boolean(is_active) : true
      }
    });
    res.status(201).json({ message: 'Event created successfully', event: newEvent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, join_token, start_time, end_time, freeze_time, is_frozen, is_active } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        name,
        join_token,
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        freeze_time: freeze_time ? new Date(freeze_time) : null,
        is_frozen: is_frozen !== undefined ? Boolean(is_frozen) : undefined,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined
      }
    });

    await broadcastScoreboardUpdate(updatedEvent.id);
    res.json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.event.delete({ where: { id } });
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
};

export const toggleBanTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { is_banned } = req.body;

    const team = await prisma.team.update({
      where: { id: teamId },
      data: { is_banned: Boolean(is_banned) }
    });

    try {
      await redis.del(`leaderboard:${team.event_id}`);
      await redis.del(`chart:${team.event_id}`);
    } catch (err) {}

    await broadcastScoreboardUpdate(team.event_id);
    res.json({ message: `Team ${team.name} has been ${team.is_banned ? 'banned' : 'unbanned'}!`, team });
  } catch (err) {
    res.status(500).json({ error: 'Failed to ban/unban team' });
  }
};

export const getAllTeamsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { score: 'desc' },
      include: {
        _count: { select: { members: true, submissions: true } },
        members: { include: { user: { select: { username: true, email: true, role: true } } } }
      }
    });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin teams' });
  }
};

// --- USER MANAGEMENT ---
export const getAllUsersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: { team_member: { include: { team: true } } }
    });
    // Remove password hashes
    const sanitized = users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const updated = await prisma.user.update({
      where: { id },
      data: { role }
    });
    res.json({ message: 'Role updated', user: { id: updated.id, role: updated.role } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

export const deleteUserAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// --- CATEGORY MANAGEMENT ---
export const getAllCategoriesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const createCategoryAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Category name is required' });
      return;
    }
    const cat = await prisma.category.create({ data: { name: name.trim().toUpperCase() } });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const deleteCategoryAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};
