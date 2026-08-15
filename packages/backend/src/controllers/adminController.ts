import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import { broadcastScoreboardUpdate } from '../sockets/scoreboardSocket.ts';
import redis from '../config/redis.js';
import { generateInviteCode, hashPassword } from '../utils/crypto.js';



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
    const { 
      name, 
      join_token, 
      start_time, 
      end_time, 
      freeze_time, 
      is_frozen, 
      is_active, 
      is_chained, 
      participation_mode = 'TEAM', 
      max_team_size = 5 
    } = req.body;

    const newEvent = await prisma.event.create({
      data: {
        name,
        join_token,
        participation_mode: participation_mode || 'TEAM',
        max_team_size: Math.max(1, Number(max_team_size) || 5),
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        freeze_time: freeze_time ? new Date(freeze_time) : null,
        is_frozen: is_frozen !== undefined ? Boolean(is_frozen) : false,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        is_chained: is_chained !== undefined ? Boolean(is_chained) : false
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
    const { 
      name, 
      join_token, 
      start_time, 
      end_time, 
      freeze_time, 
      is_frozen, 
      is_active, 
      is_chained, 
      participation_mode, 
      max_team_size 
    } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(join_token ? { join_token } : {}),
        ...(participation_mode ? { participation_mode } : {}),
        ...(max_team_size !== undefined ? { max_team_size: Math.max(1, Number(max_team_size) || 1) } : {}),
        start_time: start_time ? new Date(start_time) : null,
        end_time: end_time ? new Date(end_time) : null,
        freeze_time: freeze_time ? new Date(freeze_time) : null,
        is_frozen: is_frozen !== undefined ? Boolean(is_frozen) : undefined,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined,
        is_chained: is_chained !== undefined ? Boolean(is_chained) : undefined
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
        event: { select: { id: true, name: true } },
        _count: { select: { members: true, submissions: true } },
        members: { include: { user: { select: { id: true, username: true, email: true, role: true, created_at: true } } } },
        submissions: {
          where: { is_correct: true },
          include: { challenge: { select: { id: true, title: true, category: true, points: true } } },
          orderBy: { submitted_at: 'desc' }
        }
      }
    });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin teams' });
  }
};

export const getTeamDetailsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true, is_active: true } },
        _count: { select: { members: true, submissions: true } },
        members: {
          include: { user: { select: { id: true, username: true, email: true, role: true, created_at: true } } }
        },
        submissions: {
          where: { is_correct: true },
          include: { challenge: { select: { id: true, title: true, category: true, points: true } } },
          orderBy: { submitted_at: 'desc' }
        },
        first_bloods: {
          include: { challenge: { select: { id: true, title: true } } }
        }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    res.json(team);
  } catch (err) {
    console.error('Get team details admin error:', err);
    res.status(500).json({ error: 'Failed to fetch team details' });
  }
};

export const createTeamAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, invite_code, event_id, color, score = 0 } = req.body;
    if (!name || !event_id) {
      res.status(400).json({ error: 'Team name and event_id are required' });
      return;
    }

    const existing = await prisma.team.findUnique({ where: { name: name.trim() } });
    if (existing) {
      res.status(409).json({ error: 'Team name is already in use' });
      return;
    }

    const code = (invite_code?.trim() || generateInviteCode()).toUpperCase();
    const existingCode = await prisma.team.findUnique({ where: { invite_code: code } });
    if (existingCode) {
      res.status(409).json({ error: 'Invite code is already in use' });
      return;
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        invite_code: code,
        event_id,
        color: color || '#00F0FF',
        score: Number(score) || 0,
        leader_id: req.user!.id // Admin placeholder or will auto-transfer to first member
      }
    });

    try {
      await redis.del(`leaderboard:${team.event_id}`);
      await redis.del(`chart:${team.event_id}`);
    } catch (err) {}

    await broadcastScoreboardUpdate(team.event_id);
    res.status(201).json({ message: 'Team squad created successfully', team });
  } catch (err) {
    console.error('Create team admin error:', err);
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const updateTeamAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, invite_code, score, color, is_banned, event_id, leader_id } = req.body;

    const updated = await prisma.team.update({
      where: { id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(invite_code ? { invite_code: invite_code.trim().toUpperCase() } : {}),
        ...(score !== undefined ? { score: Number(score) } : {}),
        ...(color ? { color } : {}),
        ...(is_banned !== undefined ? { is_banned: Boolean(is_banned) } : {}),
        ...(event_id ? { event_id } : {}),
        ...(leader_id ? { leader_id } : {})
      }
    });

    try {
      await redis.del(`leaderboard:${updated.event_id}`);
      await redis.del(`chart:${updated.event_id}`);
    } catch (err) {}

    await broadcastScoreboardUpdate(updated.event_id);
    res.json({ message: 'Team updated successfully', team: updated });
  } catch (err) {
    console.error('Update team admin error:', err);
    res.status(500).json({ error: 'Failed to update team' });
  }
};

export const deleteTeamAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    await prisma.team.delete({ where: { id } });

    try {
      await redis.del(`leaderboard:${team.event_id}`);
      await redis.del(`chart:${team.event_id}`);
    } catch (err) {}

    await broadcastScoreboardUpdate(team.event_id);
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    console.error('Delete team admin error:', err);
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

export const removeTeamMemberAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId, userId } = req.params;
    await prisma.teamMember.deleteMany({
      where: { team_id: teamId, user_id: userId }
    });

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true }
    });

    if (team) {
      // If removed member was the leader, reassign leader to another member if exists
      if (team.leader_id === userId) {
        if (team.members.length > 0) {
          await prisma.team.update({
            where: { id: teamId },
            data: { leader_id: team.members[0].user_id }
          });
        }
      }
      await broadcastScoreboardUpdate(team.event_id);
    }

    res.json({ message: 'Member removed from team successfully' });
  } catch (err) {
    console.error('Remove member admin error:', err);
    res.status(500).json({ error: 'Failed to remove member from team' });
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

// --- SINGLE-USE EVENT TOKENS (TICKETS / VOUCHERS) ---
import crypto from 'crypto';

const generateTokenCode = (prefix = 'RR26'): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genPart = (len: number) => {
    let res = '';
    const bytes = crypto.randomBytes(len);
    for (let i = 0; i < len; i++) {
      res += chars[bytes[i] % chars.length];
    }
    return res;
  };
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${cleanPrefix || 'RR26'}-${genPart(4)}-${genPart(4)}`;
};

export const getEventTokensAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { event_id, status } = req.query;

    const where: any = {};
    if (event_id) where.event_id = String(event_id);
    if (status === 'USED') where.is_used = true;
    if (status === 'AVAILABLE') where.is_used = false;

    const tokens = await prisma.eventToken.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        event: { select: { id: true, name: true } },
        used_by_user: {
          select: {
            id: true,
            username: true,
            email: true,
            team_member: {
              include: {
                team: { select: { id: true, name: true, score: true } }
              }
            }
          }
        }
      }
    });

    const total = tokens.length;
    const used = tokens.filter((t: any) => t.is_used).length;
    const available = total - used;

    res.json({
      stats: { total, used, available },
      tokens
    });
  } catch (err) {
    console.error('Failed to fetch event tokens:', err);
    res.status(500).json({ error: 'Failed to fetch event tokens' });
  }
};

export const generateTokensAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { event_id, count = 10, prefix = 'RR26', label } = req.body;

    if (!event_id) {
      res.status(400).json({ error: 'event_id is required' });
      return;
    }

    const event = await prisma.event.findUnique({ where: { id: event_id } });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const numTokens = Math.min(Math.max(1, Number(count) || 1), 200); // max 200 per batch
    const createdTokens: string[] = [];

    for (let i = 0; i < numTokens; i++) {
      let unique = false;
      let tokenStr = '';
      while (!unique) {
        tokenStr = generateTokenCode(prefix);
        const exists = await prisma.eventToken.findUnique({ where: { token: tokenStr } });
        if (!exists) unique = true;
      }

      await prisma.eventToken.create({
        data: {
          token: tokenStr,
          event_id,
          label: label ? `${label} #${i + 1}` : null,
          is_used: false
        }
      });
      createdTokens.push(tokenStr);
    }

    res.status(201).json({
      message: `Successfully generated ${createdTokens.length} single-use tokens!`,
      count: createdTokens.length,
      tokens: createdTokens
    });
  } catch (err) {
    console.error('Failed to generate tokens:', err);
    res.status(500).json({ error: 'Failed to generate tokens' });
  }
};

export const resetTokenAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updated = await prisma.eventToken.update({
      where: { id },
      data: {
        is_used: false,
        used_by_user_id: null,
        used_at: null
      }
    });
    res.json({ message: 'Token reset to available state', token: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset token' });
  }
};

export const deleteTokenAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.eventToken.delete({ where: { id } });
    res.json({ message: 'Token deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete token' });
  }
};

// --- IMPORT SQUADS / TEAMS FROM XLSX/JSON ---
export const importTeamsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teams, default_event_id } = req.body;

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ error: 'Data tim kosong atau format tidak sesuai.' });
      return;
    }

    // Cache events for fast lookup
    const allEvents = await prisma.event.findMany({ select: { id: true, name: true } });
    const eventNameMap = new Map(allEvents.map(e => [e.name.toLowerCase().trim(), e.id]));
    const defaultEvent = allEvents.find(e => e.id === default_event_id) || allEvents[0];

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < teams.length; i++) {
      const item = teams[i];
      const name = String(item.name || item.TeamName || item.nama || '').trim();

      if (!name) {
        skipped++;
        errors.push(`Baris ${i + 1}: Nama tim tidak boleh kosong.`);
        continue;
      }

      // Check if team already exists
      const existing = await prisma.team.findUnique({ where: { name } });
      if (existing) {
        skipped++;
        errors.push(`Baris ${i + 1}: Squad "${name}" sudah terdaftar.`);
        continue;
      }

      // Resolve event_id
      let targetEventId: string | null = null;
      if (item.event_id && allEvents.some(e => e.id === item.event_id)) {
        targetEventId = item.event_id;
      } else if (item.event_name || item.event || item.arena) {
        const rawEventName = String(item.event_name || item.event || item.arena).toLowerCase().trim();
        targetEventId = eventNameMap.get(rawEventName) || null;
      }

      if (!targetEventId && defaultEvent) {
        targetEventId = defaultEvent.id;
      }

      if (!targetEventId) {
        skipped++;
        errors.push(`Baris ${i + 1}: Event untuk tim "${name}" tidak ditemukan.`);
        continue;
      }

      // Generate or normalize invite code
      let inviteCode = String(item.invite_code || item.InviteCode || item.kode || '').trim().toUpperCase();
      if (!inviteCode) {
        let uniqueCode = false;
        while (!uniqueCode) {
          inviteCode = generateInviteCode();
          const codeExists = await prisma.team.findUnique({ where: { invite_code: inviteCode } });
          if (!codeExists) uniqueCode = true;
        }
      } else {
        const codeExists = await prisma.team.findUnique({ where: { invite_code: inviteCode } });
        if (codeExists) {
          inviteCode = generateInviteCode();
        }
      }

      const score = Number(item.score || item.initial_score || item.Score || 0);
      const color = String(item.color || item.Color || '#00F0FF').trim();

      try {
        await prisma.team.create({
          data: {
            name,
            invite_code: inviteCode,
            score: isNaN(score) ? 0 : score,
            color: color || '#00F0FF',
            event_id: targetEventId,
            leader_id: req.user!.id
          }
        });
        imported++;
      } catch (err: any) {

        skipped++;
        errors.push(`Baris ${i + 1}: Gagal membuat tim "${name}" (${err.message}).`);
      }
    }

    res.status(200).json({
      message: `Berhasil mengimpor ${imported} tim. (${skipped} dilewati/gagal)`,
      imported,
      skipped,
      errors
    });
  } catch (err) {
    console.error('Import teams error:', err);
    res.status(500).json({ error: 'Gagal memproses import tim.' });
  }
};

// --- IMPORT USERS FROM XLSX/JSON ---
export const importUsersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { users, default_role = 'PARTICIPANT', default_event_id } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      res.status(400).json({ error: 'Data user kosong atau format tidak sesuai.' });
      return;
    }

    const allEvents = await prisma.event.findMany({ select: { id: true, name: true } });
    const eventNameMap = new Map(allEvents.map(e => [e.name.toLowerCase().trim(), e.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < users.length; i++) {
      const item = users[i];
      const username = String(item.username || item.Username || '').trim();
      const email = String(item.email || item.Email || '').trim().toLowerCase();
      const rawPassword = String(item.password || item.Password || 'password123').trim();
      const roleStr = String(item.role || item.Role || default_role).toUpperCase().trim();
      const role = roleStr === 'ADMIN' ? 'ADMIN' : 'PARTICIPANT';

      if (!username || !email) {
        skipped++;
        errors.push(`Baris ${i + 1}: Username dan email wajib diisi.`);
        continue;
      }

      // Check if username or email already exists
      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email }]
        }
      });

      if (existing) {
        skipped++;
        errors.push(`Baris ${i + 1}: User @${username} (${email}) sudah terdaftar.`);
        continue;
      }

      // Resolve event_id
      let targetEventId: string | null = null;
      if (item.event_id && allEvents.some(e => e.id === item.event_id)) {
        targetEventId = item.event_id;
      } else if (item.event_name || item.event || item.arena) {
        const rawEventName = String(item.event_name || item.event || item.arena).toLowerCase().trim();
        targetEventId = eventNameMap.get(rawEventName) || null;
      } else if (default_event_id && allEvents.some(e => e.id === default_event_id)) {
        targetEventId = default_event_id;
      }

      try {
        const password_hash = await hashPassword(rawPassword || 'password123');
        await prisma.user.create({
          data: {
            username,
            email,
            password_hash,
            role,
            event_id: targetEventId
          }
        });
        imported++;
      } catch (err: any) {
        skipped++;
        errors.push(`Baris ${i + 1}: Gagal membuat user @${username} (${err.message}).`);
      }
    }

    res.status(200).json({
      message: `Berhasil mengimpor ${imported} user. (${skipped} dilewati/gagal)`,
      imported,
      skipped,
      errors
    });
  } catch (err) {
    console.error('Import users error:', err);
    res.status(500).json({ error: 'Gagal memproses import user.' });
  }
};


