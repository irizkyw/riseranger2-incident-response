import { Response } from 'express';
import prisma from '../config/db.js';
import { AuthRequest } from '../middlewares/auth.ts';
import {
  broadcastScoreboardUpdate,
  broadcastScoreboardSync,
  broadcastLiveActivity,
  broadcastSessionControl,
  broadcastEventPause,
  broadcastEventFinished
} from '../sockets/scoreboardSocket.ts';
import redis from '../config/redis.js';
import { generateInviteCode, hashPassword } from '../utils/crypto.js';
import { getRoleRank } from '../utils/rbac.js';




export const getAdminStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalTeams,
      totalChallenges,
      totalSubmissions,
      correctSubmissions,
      challenges,
      correctSolvesGroup
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'PARTICIPANT' } }),
      prisma.team.count(),
      prisma.challenge.count(),
      prisma.submission.count(),
      prisma.submission.count({ where: { is_correct: true } }),
      prisma.challenge.findMany({
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
        },
        orderBy: { created_at: 'desc' }
      }),
      prisma.submission.groupBy({
        by: ['challenge_id'],
        where: { is_correct: true },
        _count: {
          _all: true
        }
      })
    ]);

    const solvesMap = new Map<string, number>();
    for (const item of correctSolvesGroup) {
      solvesMap.set(item.challenge_id, item._count._all);
    }

    const solveRates = challenges.map((c) => {
      const solves = solvesMap.get(c.id) || 0;
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
    });

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
      min_team_size = 1,
      max_team_size = 5
    } = req.body;

    const parsedMin = Math.max(1, Number(min_team_size) || 1);
    const parsedMax = Math.max(parsedMin, Number(max_team_size) || 5);

    const newEvent = await prisma.event.create({
      data: {
        name,
        join_token,
        participation_mode: participation_mode || 'TEAM',
        min_team_size: parsedMin,
        max_team_size: parsedMax,
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
      min_team_size,
      max_team_size
    } = req.body;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(join_token ? { join_token } : {}),
        ...(participation_mode ? { participation_mode } : {}),
        ...(min_team_size !== undefined ? { min_team_size: Math.max(1, Number(min_team_size) || 1) } : {}),
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
    } catch (err) { }

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
    } catch (err) { }

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
    } catch (err) { }

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
    } catch (err) { }

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

export const addTeamMemberAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teamId } = req.params;
    const { user_id, username, email } = req.body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        event: true,
        members: { include: { user: { select: { id: true, username: true, email: true } } } }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }

    let targetUser = null;
    if (user_id) {
      targetUser = await prisma.user.findUnique({ where: { id: user_id } });
    } else if (username) {
      targetUser = await prisma.user.findUnique({ where: { username: username.trim() } });
    } else if (email) {
      targetUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    }

    if (!targetUser) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const alreadyInTeam = team.members.some(m => m.user_id === targetUser.id);
    if (alreadyInTeam) {
      res.status(400).json({ error: `@${targetUser.username} sudah berada di dalam squad tim ini` });
      return;
    }

    // Remove user from any prior team membership first
    await prisma.teamMember.deleteMany({
      where: { user_id: targetUser.id }
    });

    // Synchronize event_id if team is assigned to an event
    if (team.event_id && targetUser.event_id !== team.event_id) {
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { event_id: team.event_id }
      });
    }

    // Create team member association
    await prisma.teamMember.create({
      data: {
        team_id: team.id,
        user_id: targetUser.id
      }
    });

    // Set leader if not set
    if (!team.leader_id || team.members.length === 0) {
      await prisma.team.update({
        where: { id: team.id },
        data: { leader_id: targetUser.id }
      });
    }

    await (prisma as any).userTeamHistory.create({
      data: {
        user_id: targetUser.id,
        team_id: team.id,
        joined_at: new Date()
      }
    }).catch(() => { });

    await broadcastScoreboardUpdate(team.event_id);

    const updatedTeam = await prisma.team.findUnique({
      where: { id: team.id },
      include: {
        event: { select: { id: true, name: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                role: true,
                created_at: true
              }
            }
          }
        },
        submissions: {
          include: {
            challenge: { select: { title: true, points: true, category: true } }
          },
          orderBy: { submitted_at: 'desc' }
        }
      }
    });

    res.json({
      message: `Operative @${targetUser.username} berhasil ditambahkan ke tim "${team.name}"!`,
      team: updatedTeam
    });
  } catch (err: any) {
    console.error('addTeamMemberAdmin error:', err);
    res.status(500).json({ error: 'Gagal menambahkan user ke tim', details: err.message });
  }
};


// --- USER MANAGEMENT ---

export const searchUsersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawQ = (req.query.q as string || '').trim().replace(/^@/, '');
    if (!rawQ || rawQ.length < 1) {
      res.json([]);
      return;
    }

    let users: any[] = [];
    try {
      users = await (prisma.user as any).findMany({
        where: {
          OR: [
            { username: { contains: rawQ, mode: 'insensitive' } },
            { email: { contains: rawQ, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        },
        take: 10,
        orderBy: { username: 'asc' }
      });
    } catch {
      users = await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: rawQ.toLowerCase() } },
            { email: { contains: rawQ.toLowerCase() } }
          ]
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        },
        take: 10,
        orderBy: { username: 'asc' }
      });
    }

    const userIds = users.map(u => u.id);
    const memberships = userIds.length > 0 ? await (prisma as any).teamMember.findMany({
      where: { user_id: { in: userIds } },
      include: { team: { select: { id: true, name: true } } }
    }) : [];

    const teamMap: Record<string, { id: string; name: string }> = {};
    for (const m of memberships) {
      if (m.team) teamMap[m.user_id] = { id: m.team.id, name: m.team.name };
    }

    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      current_team_id: teamMap[u.id]?.id || null,
      current_team: teamMap[u.id]?.name || null
    })));
  } catch (err) {
    console.error('searchUsersAdmin error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const getAllUsersAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        event: { select: { id: true, name: true } },
        team_member: { include: { team: true } },
        used_tokens: {
          select: {
            id: true,
            token: true,
            label: true,
            used_at: true,
            created_at: true,
            event: { select: { id: true, name: true } }
          },
          orderBy: { used_at: 'desc' }
        },
        submissions: {
          select: {
            id: true,
            is_correct: true,
            submitted_at: true,
            challenge: { select: { id: true, title: true, category: true, points: true } }
          },
          orderBy: { submitted_at: 'desc' },
          take: 50
        },
        writeups: {
          select: {
            id: true,
            file_name: true,
            file_size: true,
            score: true,
            feedback: true,
            evaluated_at: true,
            submitted_at: true,
            event: { select: { id: true, name: true } }
          },
          orderBy: { submitted_at: 'desc' }
        }
      }
    });
    // Remove password hashes
    const sanitized = users.map(u => {
      const { password_hash, ...rest } = u;
      return rest;
    });
    res.json(sanitized);
  } catch (err) {
    console.error('getAllUsersAdmin error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};


export const createUserAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, email, password, role, event_id, team_id } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Username, email, dan password wajib diisi.' });
      return;
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: trimmedUsername }, { email: trimmedEmail }]
      }
    });

    if (existing) {
      res.status(409).json({ error: 'Username atau Email sudah terdaftar dalam sistem.' });
      return;
    }

    const callerRole = (req.user?.role || '').toUpperCase();
    const callerRank = getRoleRank(callerRole);
    const assignedRank = getRoleRank(role || 'PARTICIPANT');

    // Hierarchy rule: Caller cannot create accounts with rank equal or higher than their own (unless Superadmin)
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN' && assignedRank >= callerRank) {
      res.status(403).json({
        error: `🛡️ Akses Ditolak: Role "${callerRole}" tidak memiliki wewenang membuat akun dengan tingkatan role setara atau lebih tinggi (${role}).`
      });
      return;
    }

    const password_hash = await hashPassword(password);
    const validRole = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'PARTICIPANT', 'JURY', 'MODERATOR'].includes(role) ? role : 'PARTICIPANT';

    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        password_hash,
        role: validRole as any,
        event_id: event_id || null
      }
    });

    if (team_id) {
      try {
        await prisma.teamMember.create({
          data: {
            team_id,
            user_id: user.id
          }
        });
      } catch (teamErr) {
        console.warn('Failed to assign user to team:', teamErr);
      }
    }

    res.status(201).json({
      message: `User @${user.username} berhasil dibuat!`,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        event_id: user.event_id,
        created_at: user.created_at
      }
    });
  } catch (err: any) {
    console.error('createUserAdmin error:', err);
    res.status(500).json({ error: 'Gagal membuat user baru', details: err.message });
  }
};

export const updateUserAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, email, role, password, event_id, team_id } = req.body;
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerRank = getRoleRank(callerRole);

    const user = await prisma.user.findUnique({
      where: { id },
      include: { team_member: true }
    });

    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const targetUserRank = getRoleRank(user.role);

    // Hierarchy rule 1: Caller cannot edit users with rank equal to or higher than their own
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
      if (targetUserRank >= callerRank && req.user?.id !== id) {
        res.status(403).json({
          error: `🛡️ Akses Ditolak: Akun dengan role "${callerRole}" tidak memiliki wewenang mengedit/memodifikasi akun berhierarki setara atau lebih tinggi (${user.role}).`
        });
        return;
      }

      // Hierarchy rule 2: Caller cannot assign role equal to or higher than their own rank
      if (role) {
        const newRoleRank = getRoleRank(role);
        if (newRoleRank >= callerRank) {
          res.status(403).json({
            error: `🛡️ Akses Ditolak: Anda tidak diizinkan memberikan/menaikkan role ke tingkat setara atau lebih tinggi (${role}).`
          });
          return;
        }
      }
    }

    const updateData: any = {};
    if (username && username.trim() !== '') updateData.username = username.trim();
    if (email && email.trim() !== '') updateData.email = email.trim().toLowerCase();
    if (role && ['ADMIN', 'SUPERADMIN', 'WADMIN', 'PARTICIPANT', 'JURY', 'MODERATOR'].includes(role)) {
      updateData.role = role;
    }
    if (event_id !== undefined) updateData.event_id = event_id || null;
    if (password && password.trim() !== '') {
      updateData.password_hash = await hashPassword(password.trim());
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        event_id: true,
        created_at: true
      }
    });

    // Handle Team assignment / change if specified
    if (team_id !== undefined) {
      if (team_id === null || team_id === '') {
        if (user.team_member) {
          await prisma.teamMember.delete({ where: { user_id: id } });
        }
      } else {
        await prisma.teamMember.upsert({
          where: { user_id: id },
          create: { team_id, user_id: id },
          update: { team_id }
        });
      }
    }

    res.json({
      message: `Data user @${updatedUser.username} berhasil diperbarui!`,
      user: updatedUser
    });
  } catch (err: any) {
    console.error('updateUserAdmin error:', err);
    res.status(500).json({ error: 'Gagal memperbarui data user', details: err.message });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerRank = getRoleRank(callerRole);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const targetUserRank = getRoleRank(targetUser.role);

    // Hierarchy rule 1: Cannot change role of user with equal or higher rank
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN') {
      if (targetUserRank >= callerRank) {
        res.status(403).json({
          error: `🛡️ Akses Ditolak: Anda tidak memiliki wewenang mengubah role akun berhierarki setara atau lebih tinggi (${targetUser.role}).`
        });
        return;
      }

      // Hierarchy rule 2: Cannot promote user to equal or higher rank
      if (role) {
        const newRoleRank = getRoleRank(role);
        if (newRoleRank >= callerRank) {
          res.status(403).json({
            error: `🛡️ Akses Ditolak: Anda tidak memiliki wewenang memberikan role ke tingkat setara atau lebih tinggi (${role}).`
          });
          return;
        }
      }
    }

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
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerRank = getRoleRank(callerRole);

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const targetRole = (targetUser.role || '').toUpperCase();
    const targetUserRank = getRoleRank(targetRole);

    // Absolute protection for SUPERADMIN/ADMIN
    if (targetRole === 'ADMIN' || targetRole === 'SUPERADMIN') {
      res.status(403).json({
        error: '🛡️ Akses Ditolak: Akun Super Administrator (ADMIN) dilindungi dan tidak dapat dihapus!'
      });
      return;
    }

    // Hierarchy rule: Caller cannot delete accounts with equal or higher rank
    if (callerRole !== 'ADMIN' && callerRole !== 'SUPERADMIN' && targetUserRank >= callerRank) {
      res.status(403).json({
        error: `🛡️ Akses Ditolak: Anda tidak memiliki wewenang menghapus akun dengan hierarki role setara atau lebih tinggi (${targetUser.role}).`
      });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    display_name: 'Headquarters Administrator (Super Command)',
    description: 'Akses penuh ke seluruh kontrol arena, manajemen event, force stop & pause live radar, token generator, challenge CRUD, evaluasi writeup, dan manajemen akun staf/admin.',
    badge_color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    is_system: true,
    permissions: [
      'Full HQ Command Access',
      'Arena & Live Radar Control (Pause/Stop)',
      'Challenge CRUD & Flag Management',
      'Access Token Generation & Revocation',
      'Writeup Evaluation & Scoring',
      'User & Squad Moderation',
      'Staff & Admin Account Management'
    ]
  },
  {
    name: 'WADMIN',
    display_name: 'Wakil Administrator (Co-Admin / Vice Lead)',
    description: 'Akses penuh kontrol operasional HQ, challenge CRUD, event, dan manajemen peserta, namun diproteksi dari mengedit/menghapus akun Super Admin (ADMIN).',
    badge_color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    is_system: true,
    permissions: [
      'Full HQ Command Access (Protected from Admin Edit)',
      'Arena & Live Radar Control (Pause/Stop)',
      'Challenge CRUD & Flag Management',
      'Access Token Generation & Revocation',
      'Writeup Evaluation & Scoring',
      'Participant & Squad Moderation'
    ]
  },
  {
    name: 'JURY',
    display_name: 'Jury / Evaluator (Dewan Juri)',
    description: 'Akses khusus untuk menilai, membaca dokumen laporan writeup peserta, memberikan skor evaluasi, dan memeriksa validitas temuan solusi.',
    badge_color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    is_system: true,
    permissions: [
      'Writeup Document Viewer & Inline Reader',
      'Score & Feedback Grading Form',
      'View Challenge Solutions & Flags',
      'Live Submissions Stream Monitor'
    ]
  },
  {
    name: 'MODERATOR',
    display_name: 'Arena Moderator & Proctor (Pengawas)',
    description: 'Akses pengawasan aktivitas peserta, monitoring radar live pengerjaan tantangan, dan log stream tanpa izin merubah konfigurasi event.',
    badge_color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    is_system: true,
    permissions: [
      'Live Radar Activity Monitor',
      'Inspect Operatives & Squad Roster',
      'View Real-Time Submissions Log',
      'Scoreboard Timeline Inspection'
    ]
  },
  {
    name: 'PARTICIPANT',
    display_name: 'Arena Contender (Operative / Peserta)',
    description: 'Peserta resmi yang bertanding di arena CTF, memecahkan soal tantangan, submit flag, membentuk tim, dan mengunggah laporan writeup.',
    badge_color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    is_system: true,
    permissions: [
      'Arena Dashboard & Challenge Solver',
      'Team Formation & Invite Code Sharing',
      'Flag Submission (Hit The Flag)',
      'Writeup Upload & Viewer',
      '2D & 3D Interactive Scoreboard'
    ]
  }
];

const seedDefaultRoles = async () => {
  for (const r of DEFAULT_SYSTEM_ROLES) {
    const existing = await (prisma as any).customRole.findUnique({ where: { name: r.name } });
    if (!existing) {
      await (prisma as any).customRole.create({
        data: {
          name: r.name,
          display_name: r.display_name,
          description: r.description,
          badge_color: r.badge_color,
          is_system: true,
          permissions: r.permissions
        }
      });
    } else if (existing.is_system && (!existing.permissions || existing.permissions.length === 0 || existing.permissions.includes('*') || existing.permissions.includes('view_challenges'))) {
      await (prisma as any).customRole.update({
        where: { name: r.name },
        data: {
          display_name: r.display_name,
          description: r.description,
          badge_color: r.badge_color,
          permissions: r.permissions
        }
      });
    }
  }
};

export const getAllRolesAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await seedDefaultRoles();

    const [dbRoles, userGroups] = await Promise.all([
      (prisma as any).customRole.findMany({
        orderBy: [{ is_system: 'desc' }, { created_at: 'asc' }]
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      })
    ]);

    const countMap: Record<string, number> = {};
    userGroups.forEach((g: any) => {
      countMap[g.role] = g._count.id;
    });

    const rolesWithCounts = dbRoles.map((r: any) => ({
      id: r.id,
      name: r.name,
      display_name: r.display_name,
      description: r.description || '',
      badge_color: r.badge_color || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      is_system: r.is_system,
      userCount: countMap[r.name] || 0,
      permissions: Array.isArray(r.permissions) ? r.permissions : []
    }));

    res.json(rolesWithCounts);
  } catch (err: any) {
    console.error('getAllRolesAdmin error:', err);
    res.status(500).json({ error: 'Gagal memuat data roles' });
  }
};

export const createRoleAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, display_name, description, badge_color, permissions } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Kode nama role wajib diisi (misal: SPONSOR_JURY, VIP_GUEST).' });
      return;
    }

    const cleanCode = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanTitle = (display_name || cleanCode).trim();

    const existing = await (prisma as any).customRole.findUnique({ where: { name: cleanCode } });
    if (existing) {
      res.status(409).json({ error: `Role dengan kode "${cleanCode}" sudah terdaftar.` });
      return;
    }

    const createdRole = await (prisma as any).customRole.create({
      data: {
        name: cleanCode,
        display_name: cleanTitle,
        description: description?.trim() || null,
        badge_color: badge_color || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        permissions: Array.isArray(permissions) ? permissions : ['Dashboard Access', 'Basic Participation'],
        is_system: false
      }
    });

    res.status(201).json({
      message: `Role baru "${createdRole.name}" berhasil dibuat!`,
      role: createdRole
    });
  } catch (err: any) {
    console.error('createRoleAdmin error:', err);
    res.status(500).json({ error: 'Gagal membuat role baru', details: err.message });
  }
};

export const updateRoleAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { display_name, description, badge_color, permissions } = req.body;

    const existing = await (prisma as any).customRole.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Role tidak ditemukan' });
      return;
    }

    const updated = await (prisma as any).customRole.update({
      where: { id },
      data: {
        display_name: display_name ? display_name.trim() : existing.display_name,
        description: description !== undefined ? description.trim() : existing.description,
        badge_color: badge_color || existing.badge_color,
        permissions: Array.isArray(permissions) ? permissions : existing.permissions
      }
    });

    res.json({
      message: `Role "${updated.name}" berhasil diperbarui!`,
      role: updated
    });
  } catch (err: any) {
    console.error('updateRoleAdmin error:', err);
    res.status(500).json({ error: 'Gagal memperbarui role', details: err.message });
  }
};

export const deleteRoleAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await (prisma as any).customRole.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Role tidak ditemukan' });
      return;
    }

    if (existing.is_system) {
      res.status(403).json({ error: `Role bawaan sistem (${existing.name}) tidak dapat dihapus!` });
      return;
    }

    // Reassign any users with this role to PARTICIPANT
    await prisma.user.updateMany({
      where: { role: existing.name },
      data: { role: 'PARTICIPANT' }
    });

    await (prisma as any).customRole.delete({ where: { id } });

    res.json({
      message: `Role "${existing.name}" berhasil dihapus dan akun terkait dialihkan ke role PARTICIPANT.`
    });
  } catch (err: any) {
    console.error('deleteRoleAdmin error:', err);
    res.status(500).json({ error: 'Gagal menghapus role', details: err.message });
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

    const tokenRecord = await prisma.eventToken.findUnique({
      where: { id },
      include: {
        used_by_user: {
          include: {
            team_member: {
              include: { team: true }
            }
          }
        }
      }
    });

    if (!tokenRecord) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const claimedUserId = tokenRecord.used_by_user_id;

    if (claimedUserId) {
      const teamMember = tokenRecord.used_by_user?.team_member;
      const teamId = teamMember?.team_id;

      // 1. Unlink user from event (revert to initial unverified state)
      await prisma.user.update({
        where: { id: claimedUserId },
        data: { event_id: null }
      });

      // 2. Remove user from squad/team
      if (teamMember) {
        await prisma.teamMember.delete({
          where: { id: teamMember.id }
        });

        if (teamId) {
          const remainingMembers = await prisma.teamMember.findMany({
            where: { team_id: teamId },
            orderBy: { joined_at: 'asc' }
          });

          if (remainingMembers.length === 0) {
            // Delete orphaned empty team
            await prisma.team.delete({
              where: { id: teamId }
            });
          } else if (teamMember.team.leader_id === claimedUserId) {
            // Reassign leader to remaining member
            await prisma.team.update({
              where: { id: teamId },
              data: { leader_id: remainingMembers[0].user_id }
            });
          }
        }
      }

      try {
        await redis.del(`leaderboard:${tokenRecord.event_id}`);
        await redis.del(`chart:${tokenRecord.event_id}`);
      } catch (err) { }

      await broadcastScoreboardUpdate(tokenRecord.event_id);
      await broadcastScoreboardSync(tokenRecord.event_id);
    }

    const updated = await prisma.eventToken.update({
      where: { id },
      data: {
        is_used: false,
        used_by_user_id: null,
        used_at: null
      }
    });

    res.json({
      message: 'Token berhasil di-reset menjadi AVAILABLE dan akses peserta/tim terkait telah di-unlink ke status awal!',
      token: updated
    });
  } catch (err) {
    console.error('Failed to reset token:', err);
    res.status(500).json({ error: 'Failed to reset token' });
  }
};

export const deleteTokenAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const tokenRecord = await prisma.eventToken.findUnique({
      where: { id },
      include: {
        used_by_user: {
          include: {
            team_member: {
              include: { team: true }
            }
          }
        }
      }
    });

    if (!tokenRecord) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }

    const claimedUserId = tokenRecord.used_by_user_id;

    if (claimedUserId) {
      const teamMember = tokenRecord.used_by_user?.team_member;
      const teamId = teamMember?.team_id;

      await prisma.user.update({
        where: { id: claimedUserId },
        data: { event_id: null }
      });

      if (teamMember) {
        await prisma.teamMember.delete({
          where: { id: teamMember.id }
        });

        if (teamId) {
          const remainingMembers = await prisma.teamMember.findMany({
            where: { team_id: teamId },
            orderBy: { joined_at: 'asc' }
          });

          if (remainingMembers.length === 0) {
            await prisma.team.delete({
              where: { id: teamId }
            });
          } else if (teamMember.team.leader_id === claimedUserId) {
            await prisma.team.update({
              where: { id: teamId },
              data: { leader_id: remainingMembers[0].user_id }
            });
          }
        }
      }

      try {
        await redis.del(`leaderboard:${tokenRecord.event_id}`);
        await redis.del(`chart:${tokenRecord.event_id}`);
      } catch (err) { }

      await broadcastScoreboardUpdate(tokenRecord.event_id);
      await broadcastScoreboardSync(tokenRecord.event_id);
    }

    await prisma.eventToken.delete({ where: { id } });
    res.json({ message: 'Token deleted successfully and user/squad access unlinked' });
  } catch (err) {
    console.error('Failed to delete token:', err);
    res.status(500).json({ error: 'Failed to delete token' });
  }
};


// --- IMPORT SQUADS / TEAMS FROM XLSX/JSON WITH MEMBERS ---
export const importTeamsAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { teams, default_event_id } = req.body;

    if (!Array.isArray(teams) || teams.length === 0) {
      res.status(400).json({ error: 'Data tim kosong atau format tidak sesuai.' });
      return;
    }

    const allEvents = await prisma.event.findMany({ select: { id: true, name: true } });
    const eventNameMap = new Map(allEvents.map(e => [e.name.toLowerCase().trim(), e.id]));
    const defaultEvent = allEvents.find(e => e.id === default_event_id) || allEvents[0];

    let imported = 0;
    let skipped = 0;
    let totalMembersAssigned = 0;
    const errors: string[] = [];

    // Helper to find or auto-create participant account
    const resolveUser = async (identifier: string, eventId: string | null) => {
      const trimmed = String(identifier || '').trim();
      if (!trimmed) return null;

      const isEmail = trimmed.includes('@');
      const cleanEmail = isEmail ? trimmed.toLowerCase() : `${trimmed.toLowerCase()}@ctf.local`;
      const baseUsername = isEmail ? trimmed.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const safeBaseUsername = baseUsername || 'user';

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanEmail },
            { username: safeBaseUsername },
            { username: trimmed }
          ]
        }
      });

      if (!user) {
        let finalUsername = safeBaseUsername;
        let count = 1;
        while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
          finalUsername = `${safeBaseUsername}_${count}`;
          count++;
        }

        const password_hash = await hashPassword('Password@123');
        user = await prisma.user.create({
          data: {
            username: finalUsername,
            email: cleanEmail,
            password_hash,
            role: 'PARTICIPANT',
            event_id: eventId
          }
        });
      } else if (eventId && user.event_id !== eventId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { event_id: eventId }
        });
      }

      return user;
    };

    for (let i = 0; i < teams.length; i++) {
      const item = teams[i];
      const name = String(item.name || item.TeamName || item.nama || item.team_name || '').trim();

      if (!name) {
        skipped++;
        errors.push(`Baris ${i + 1}: Nama tim tidak boleh kosong.`);
        continue;
      }

      const existing = await prisma.team.findUnique({ where: { name } });
      if (existing) {
        skipped++;
        errors.push(`Baris ${i + 1}: Squad "${name}" sudah terdaftar.`);
        continue;
      }

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

      let inviteCode = String(item.invite_code || item.InviteCode || item.kode || item.code || '').trim().toUpperCase();
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

      // Parse Leader (Ketua) Email
      const leaderEmail = String(
        item.leader_email || item.ketua_email || item.leader || item.ketua || item.email_ketua || ''
      ).trim();

      // Parse Member (Anggota) Emails
      const memberEmailsList: string[] = [];
      const rawMembers = String(
        item.member_emails || item.anggota_emails || item.members || item.anggota || item.email_anggota || ''
      ).trim();

      if (rawMembers) {
        const splits = rawMembers.split(/[,;\n|]+/).map(s => s.trim()).filter(Boolean);
        memberEmailsList.push(...splits);
      }

      // Also check separate columns: member_1, member_2, anggota_1, anggota_2, etc.
      for (let mIdx = 1; mIdx <= 10; mIdx++) {
        const mVal = item[`member_${mIdx}`] || item[`member${mIdx}`] || item[`anggota_${mIdx}`] || item[`anggota${mIdx}`];
        if (mVal && typeof mVal === 'string' && mVal.trim()) {
          memberEmailsList.push(mVal.trim());
        }
      }

      // Filter unique members & exclude leader email to avoid duplicate assignment
      const uniqueMembers = Array.from(new Set(memberEmailsList)).filter(m => m.toLowerCase() !== leaderEmail.toLowerCase());

      try {
        const team = await prisma.team.create({
          data: {
            name,
            invite_code: inviteCode,
            score: isNaN(score) ? 0 : score,
            color: color || '#00F0FF',
            event_id: targetEventId,
            leader_id: req.user!.id
          }
        });

        let assignedLeaderId: string | null = null;

        // Assign Leader if provided
        if (leaderEmail) {
          try {
            const leaderUser = await resolveUser(leaderEmail, targetEventId);
            if (leaderUser) {
              await prisma.teamMember.deleteMany({ where: { user_id: leaderUser.id } });
              await prisma.teamMember.create({
                data: {
                  team_id: team.id,
                  user_id: leaderUser.id
                }
              });
              assignedLeaderId = leaderUser.id;
              totalMembersAssigned++;
            }
          } catch (leaderErr) {
            console.warn(`Failed to assign leader ${leaderEmail} to team ${name}:`, leaderErr);
          }
        }

        // Assign Members
        for (const mEmail of uniqueMembers) {
          try {
            const memberUser = await resolveUser(mEmail, targetEventId);
            if (memberUser) {
              await prisma.teamMember.deleteMany({ where: { user_id: memberUser.id } });
              await prisma.teamMember.create({
                data: {
                  team_id: team.id,
                  user_id: memberUser.id
                }
              });
              if (!assignedLeaderId) {
                assignedLeaderId = memberUser.id;
              }
              totalMembersAssigned++;
            }
          } catch (mErr) {
            console.warn(`Failed to assign member ${mEmail} to team ${name}:`, mErr);
          }
        }

        // If a leader was found among members/leader email, update team leader_id
        if (assignedLeaderId) {
          await prisma.team.update({
            where: { id: team.id },
            data: { leader_id: assignedLeaderId }
          });
        }

        imported++;
      } catch (err: any) {
        skipped++;
        errors.push(`Baris ${i + 1}: Gagal membuat tim "${name}" (${err.message}).`);
      }
    }

    if (defaultEvent) {
      await broadcastScoreboardUpdate(defaultEvent.id);
    }

    res.status(200).json({
      message: `Berhasil mengimpor ${imported} tim beserta ${totalMembersAssigned} anggota. (${skipped} dilewati/gagal)`,
      imported,
      total_members_assigned: totalMembersAssigned,
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

// --- ADMIN LIVE CHALLENGE ACTIVITY TRACKER ---
export const getLiveChallengeActivity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { event_id, status, search, limit = '200' } = req.query;

    // Purge any accidental attempts belonging to non-participants (Admins/Staff)
    try {
      await (prisma as any).challengeAttempt.deleteMany({
        where: {
          user: { role: { not: 'PARTICIPANT' } }
        }
      });
    } catch { }

    const andConditions: any[] = [
      { user: { role: 'PARTICIPANT' } }
    ];

    if (event_id && event_id !== 'ALL') {
      andConditions.push({
        OR: [
          { event_id: String(event_id) },
          { challenge: { event_id: String(event_id) } },
          { user: { event_id: String(event_id) } }
        ]
      });
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.trim();
      andConditions.push({
        OR: [
          { user: { username: { contains: q } } },
          { user: { email: { contains: q } } },
          { challenge: { title: { contains: q } } },
          { challenge: { category: { contains: q } } }
        ]
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const attempts = await (prisma as any).challengeAttempt.findMany({
      where,
      take: Number(limit) || 200,
      orderBy: { last_active_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            team_member: {
              include: {
                team: {
                  select: { id: true, name: true, color: true }
                }
              }
            }
          }
        },
        challenge: {
          select: {
            id: true,
            title: true,
            category: true,
            points: true,
            event_id: true,
            event: { select: { id: true, name: true } }
          }
        }
      }
    });

    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Fetch submission attempts for these user-challenge pairs
    const formatted = await Promise.all(
      attempts.map(async (att: any) => {
        const lastActive = att.last_active_at ? new Date(att.last_active_at) : now;
        const started = att.started_at ? new Date(att.started_at) : now;
        const solved = att.solved_at ? new Date(att.solved_at) : null;

        let liveStatus = att.status || 'IN_PROGRESS';
        if (liveStatus !== 'SOLVED') {
          if (lastActive >= twoMinutesAgo) {
            liveStatus = 'IN_PROGRESS';
          } else {
            liveStatus = 'IDLE';
          }
        }

        const pausedSec = att.paused_duration_seconds || 0;
        let durationSeconds = 0;
        if (solved) {
          durationSeconds = Math.max(0, Math.floor((solved.getTime() - started.getTime()) / 1000) - pausedSec);
        } else if (att.is_paused && att.paused_at) {
          durationSeconds = Math.max(0, Math.floor((new Date(att.paused_at).getTime() - started.getTime()) / 1000) - pausedSec);
        } else {
          durationSeconds = Math.max(0, Math.floor((now.getTime() - started.getTime()) / 1000) - pausedSec);
        }

        const idleSeconds = Math.max(0, Math.floor((now.getTime() - lastActive.getTime()) / 1000));

        // Submissions count with safe fallback
        let wrongAttempts = 0;
        let correctAttempts = 0;

        try {
          const submissionCounts = await prisma.submission.groupBy({
            by: ['is_correct'],
            where: {
              user_id: att.user_id,
              challenge_id: att.challenge_id
            },
            _count: { id: true }
          });

          submissionCounts.forEach((s: any) => {
            if (s.is_correct) correctAttempts += s._count?.id || 0;
            else wrongAttempts += s._count?.id || 0;
          });
        } catch (subErr) {
          console.warn('Submission count query error:', subErr);
        }

        const team = att.user?.team_member?.team;
        const isEventPaused = Boolean(att.challenge?.event?.is_paused);

        if (att.is_force_stopped) {
          liveStatus = 'FORCE_STOPPED';
        } else if (att.is_paused || isEventPaused) {
          liveStatus = 'PAUSED';
        }

        return {
          id: att.id,
          user_id: att.user_id,
          username: att.user?.username || 'Unknown',
          email: att.user?.email || 'N/A',
          team_id: team?.id || null,
          team_name: team?.name || 'Solo / No Squad',
          team_color: team?.color || '#00F0FF',
          challenge_id: att.challenge_id,
          challenge_title: att.challenge?.title || 'Unknown Challenge',
          category: att.challenge?.category || 'MISC',
          points: att.challenge?.points || 0,
          event_name: att.challenge?.event?.name || 'Global Arena',
          event_id: att.challenge?.event_id || att.event_id,
          status: liveStatus, // 'IN_PROGRESS' | 'IDLE' | 'SOLVED' | 'PAUSED' | 'FORCE_STOPPED'
          is_force_stopped: Boolean(att.is_force_stopped),
          is_paused: Boolean(att.is_paused),
          is_event_paused: isEventPaused,
          paused_duration_seconds: att.paused_duration_seconds || 0,
          paused_at: att.paused_at,
          started_at: att.started_at || now.toISOString(),
          last_active_at: att.last_active_at || now.toISOString(),
          solved_at: att.solved_at || null,
          duration_seconds: durationSeconds,
          idle_seconds: idleSeconds,
          wrong_attempts: wrongAttempts,
          correct_attempts: correctAttempts,
          total_attempts: wrongAttempts + correctAttempts
        };
      })
    );

    // Apply status filter if requested
    let result = formatted;
    if (status && status !== 'ALL') {
      result = formatted.filter((item) => item.status === status);
    }

    const activeCount = formatted.filter((i) => i.status === 'IN_PROGRESS').length;
    const idleCount = formatted.filter((i) => i.status === 'IDLE').length;
    const pausedCount = formatted.filter((i) => i.status === 'PAUSED').length;
    const forceStoppedCount = formatted.filter((i) => i.status === 'FORCE_STOPPED').length;
    const solvedCount = formatted.filter((i) => i.status === 'SOLVED').length;
    const totalSessions = formatted.length;

    res.json({
      stats: {
        active_now: activeCount,
        idle_count: idleCount,
        paused_count: pausedCount,
        force_stopped_count: forceStoppedCount,
        solved_count: solvedCount,
        total_sessions: totalSessions
      },
      activities: result
    });
  } catch (err: any) {
    console.error('getLiveChallengeActivity error:', err);
    res.status(500).json({ error: 'Failed to fetch live challenge activity', details: err.message });
  }
};

// Admin: Toggle Force Stop / Auto-Lock on a participant's challenge attempt
export const toggleForceStopAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_force_stopped } = req.body;

    const attempt = await (prisma as any).challengeAttempt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true } },
        challenge: { select: { id: true, title: true, category: true, points: true, event_id: true } }
      }
    });

    if (!attempt) {
      res.status(404).json({ error: 'Sesi pengerjaan tantangan tidak ditemukan' });
      return;
    }

    const forceStopVal = is_force_stopped !== undefined ? Boolean(is_force_stopped) : !attempt.is_force_stopped;
    const newStatus = forceStopVal ? 'FORCE_STOPPED' : (attempt.solved_at ? 'SOLVED' : (attempt.is_paused ? 'PAUSED' : 'IN_PROGRESS'));

    const updated = await (prisma as any).challengeAttempt.update({
      where: { id },
      data: {
        is_force_stopped: forceStopVal,
        status: newStatus,
        last_active_at: new Date()
      }
    });

    // Broadcast direct control alert to participant
    broadcastSessionControl({
      action: forceStopVal ? 'FORCE_STOP' : 'UNLOCK',
      attempt_id: attempt.id,
      user_id: attempt.user_id,
      challenge_id: attempt.challenge_id,
      event_id: attempt.event_id || attempt.challenge?.event_id,
      is_force_stopped: forceStopVal,
      is_paused: Boolean(attempt.is_paused),
      status: newStatus,
      message: forceStopVal
        ? '🔒 Pengerjaan tantangan ini telah dikunci (Force Stopped) oleh Admin.'
        : '🔓 Pengerjaan tantangan ini telah dibuka kembali oleh Admin.'
    });

    broadcastLiveActivity({
      type: forceStopVal ? 'FORCE_STOPPED' : 'RESUMED',
      user_id: attempt.user_id,
      username: attempt.user?.username || 'Unknown',
      email: attempt.user?.email,
      team_id: attempt.team_id,
      challenge_id: attempt.challenge_id,
      challenge_title: attempt.challenge?.title || 'Unknown',
      category: attempt.challenge?.category,
      points: attempt.challenge?.points,
      event_id: attempt.event_id || attempt.challenge?.event_id,
      started_at: updated.started_at.toISOString(),
      last_active_at: updated.last_active_at.toISOString(),
      solved_at: updated.solved_at ? updated.solved_at.toISOString() : null,
      status: newStatus,
      is_force_stopped: forceStopVal,
      is_paused: Boolean(attempt.is_paused)
    });

    res.json({
      message: forceStopVal ? 'Sesi pengerjaan berhasil di-force stop (dikunci)!' : 'Kunci sesi pengerjaan berhasil dibuka!',
      attempt: updated
    });
  } catch (err: any) {
    console.error('toggleForceStopAttempt error:', err);
    res.status(500).json({ error: 'Gagal mengubah status force stop', details: err.message });
  }
};

// Admin: Toggle Pause / Resume Stopwatch Timer on a participant's challenge attempt
export const togglePauseAttempt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_paused } = req.body;

    const attempt = await (prisma as any).challengeAttempt.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, email: true } },
        challenge: { select: { id: true, title: true, category: true, points: true, event_id: true } }
      }
    });

    if (!attempt) {
      res.status(404).json({ error: 'Sesi pengerjaan tantangan tidak ditemukan' });
      return;
    }

    const pauseVal = is_paused !== undefined ? Boolean(is_paused) : !attempt.is_paused;
    const now = new Date();

    let newPausedDuration = attempt.paused_duration_seconds || 0;
    let newPausedAt = attempt.paused_at;

    if (pauseVal) {
      // Starting pause
      newPausedAt = now;
    } else {
      // Resuming from pause -> accumulate paused seconds
      if (attempt.paused_at) {
        const diff = Math.max(0, Math.floor((now.getTime() - new Date(attempt.paused_at).getTime()) / 1000));
        newPausedDuration += diff;
      }
      newPausedAt = null;
    }

    const newStatus = pauseVal ? 'PAUSED' : (attempt.is_force_stopped ? 'FORCE_STOPPED' : (attempt.solved_at ? 'SOLVED' : 'IN_PROGRESS'));

    const updated = await (prisma as any).challengeAttempt.update({
      where: { id },
      data: {
        is_paused: pauseVal,
        paused_at: newPausedAt,
        paused_duration_seconds: newPausedDuration,
        status: newStatus,
        last_active_at: now
      }
    });

    broadcastSessionControl({
      action: pauseVal ? 'PAUSE' : 'RESUME',
      attempt_id: attempt.id,
      user_id: attempt.user_id,
      challenge_id: attempt.challenge_id,
      event_id: attempt.event_id || attempt.challenge?.event_id,
      is_force_stopped: Boolean(attempt.is_force_stopped),
      is_paused: pauseVal,
      status: newStatus,
      message: pauseVal
        ? 'Waktu pengerjaan tantangan ini sedang di-pause oleh Admin.'
        : 'Waktu pengerjaan tantangan ini telah dilanjutkan kembali!'
    });

    broadcastLiveActivity({
      type: pauseVal ? 'PAUSED' : 'RESUMED',
      user_id: attempt.user_id,
      username: attempt.user?.username || 'Unknown',
      email: attempt.user?.email,
      team_id: attempt.team_id,
      challenge_id: attempt.challenge_id,
      challenge_title: attempt.challenge?.title || 'Unknown',
      category: attempt.challenge?.category,
      points: attempt.challenge?.points,
      event_id: attempt.event_id || attempt.challenge?.event_id,
      started_at: updated.started_at.toISOString(),
      last_active_at: updated.last_active_at.toISOString(),
      solved_at: updated.solved_at ? updated.solved_at.toISOString() : null,
      status: newStatus,
      is_force_stopped: Boolean(attempt.is_force_stopped),
      is_paused: pauseVal
    });

    res.json({
      message: pauseVal ? 'Timer pengerjaan berhasil di-pause!' : 'Timer pengerjaan berhasil dilanjutkan!',
      attempt: updated
    });
  } catch (err: any) {
    console.error('togglePauseAttempt error:', err);
    res.status(500).json({ error: 'Gagal mengubah status pause timer', details: err.message });
  }
};

// Admin: Toggle Pause / Resume Entire Event Competition Time
export const togglePauseEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_paused } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: 'Event tidak ditemukan' });
      return;
    }

    const pauseVal = is_paused !== undefined ? Boolean(is_paused) : !(event as any).is_paused;
    const now = new Date();

    const updated = await (prisma as any).event.update({
      where: { id },
      data: {
        is_paused: pauseVal,
        paused_at: pauseVal ? now : null
      }
    });

    broadcastEventPause(
      event.id,
      pauseVal,
      pauseVal ? `Arena "${event.name}" sedang di-pause oleh Admin.` : `Arena "${event.name}" telah dilanjutkan kembali!`
    );
    broadcastSessionControl({
      action: pauseVal ? 'PAUSE' : 'RESUME',
      attempt_id: '',
      user_id: '',
      challenge_id: '',
      event_id: event.id,
      is_force_stopped: false,
      is_paused: pauseVal,
      status: pauseVal ? 'PAUSED' : 'IN_PROGRESS',
      message: pauseVal ? `Arena "${event.name}" sedang di-pause oleh Admin.` : `Arena "${event.name}" telah dilanjutkan kembali!`
    });
    // Run scoreboard sync in background without blocking response
    broadcastScoreboardUpdate(event.id).catch(e => console.error('Background scoreboard update error:', e));

    res.json({
      message: pauseVal ? `Kompetisi arena "${event.name}" berhasil di-pause!` : `Kompetisi arena "${event.name}" berhasil dilanjutkan!`,
      event: updated
    });
  } catch (err: any) {
    console.error('togglePauseEvent error:', err);
    res.status(500).json({ error: 'Gagal mengubah status pause event', details: err.message });
  }
};

// Admin: Force Finish / Selesaikan Event
export const forceFinishEvent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_finished } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) {
      res.status(404).json({ error: 'Event tidak ditemukan' });
      return;
    }

    const finishVal = is_finished !== undefined ? Boolean(is_finished) : !(event as any).is_finished;
    const now = new Date();

    const updated = await (prisma as any).event.update({
      where: { id },
      data: {
        is_finished: finishVal,
        finished_at: finishVal ? now : null,
        is_active: finishVal ? false : true,
        end_time: finishVal ? now : event.end_time
      }
    });

    // If finished, mark all active challenge attempts in this event as expired/finished
    if (finishVal) {
      await (prisma as any).challengeAttempt.updateMany({
        where: {
          event_id: id,
          status: { in: ['IN_PROGRESS', 'IDLE', 'PAUSED'] }
        },
        data: {
          status: 'FINISHED',
          is_force_stopped: true
        }
      });
    }

    broadcastEventFinished(
      event.id,
      finishVal,
      finishVal ? `🏆 Arena "${event.name}" telah diselesaikan secara resmi oleh Panitia!` : `Arena "${event.name}" telah dibuka kembali!`
    );
    // Run scoreboard sync in background without blocking
    broadcastScoreboardUpdate(event.id).catch(e => console.error('Background scoreboard update error:', e));

    res.json({
      message: finishVal ? `Event "${event.name}" berhasil diselesaikan!` : `Event "${event.name}" berhasil dibuka kembali!`,
      event: updated
    });
  } catch (err: any) {
    console.error('forceFinishEvent error:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan event', details: err.message });
  }
};

// Admin: Toggle Force Stop on entire Team
export const toggleForceStopTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // team_id
    const { is_force_stopped } = req.body;

    const team = await (prisma as any).team.findUnique({
      where: { id },
      include: {
        members: { select: { user_id: true } }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Tim tidak ditemukan' });
      return;
    }

    const forceStopVal = is_force_stopped !== undefined ? Boolean(is_force_stopped) : !team.is_force_stopped;

    // Update Team record
    const updatedTeam = await (prisma as any).team.update({
      where: { id },
      data: { is_force_stopped: forceStopVal }
    });

    // Update all challenge attempts belonging to this team
    const now = new Date();
    await (prisma as any).challengeAttempt.updateMany({
      where: {
        team_id: id,
        status: { not: 'SOLVED' }
      },
      data: {
        is_force_stopped: forceStopVal,
        status: forceStopVal ? 'FORCE_STOPPED' : 'IN_PROGRESS',
        last_active_at: now
      }
    });

    broadcastSessionControl({
      action: forceStopVal ? 'FORCE_STOP' : 'UNLOCK',
      attempt_id: '',
      user_id: '',
      team_id: id,
      challenge_id: '',
      event_id: team.event_id,
      is_force_stopped: forceStopVal,
      is_paused: Boolean(team.is_paused),
      status: forceStopVal ? 'FORCE_STOPPED' : 'IN_PROGRESS',
      message: forceStopVal
        ? `🔒 Seluruh pengerjaan Tim "${team.name}" telah dikunci (Force Stopped) oleh Admin.`
        : `🔓 Kunci pengerjaan Tim "${team.name}" telah dibuka kembali oleh Admin.`
    });

    res.json({
      message: forceStopVal ? `Tim "${team.name}" berhasil di-force stop!` : `Kunci Tim "${team.name}" berhasil dibuka!`,
      team: updatedTeam
    });
  } catch (err: any) {
    console.error('toggleForceStopTeam error:', err);
    res.status(500).json({ error: 'Gagal mengubah status force stop tim', details: err.message });
  }
};

// Admin: Toggle Pause Timer on entire Team
export const togglePauseTeam = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // team_id
    const { is_paused } = req.body;

    const team = await (prisma as any).team.findUnique({
      where: { id },
      include: {
        members: { select: { user_id: true } }
      }
    });

    if (!team) {
      res.status(404).json({ error: 'Tim tidak ditemukan' });
      return;
    }

    const pauseVal = is_paused !== undefined ? Boolean(is_paused) : !team.is_paused;
    const now = new Date();

    // Update Team record
    const updatedTeam = await (prisma as any).team.update({
      where: { id },
      data: { is_paused: pauseVal }
    });

    // Update attempts for this team
    if (pauseVal) {
      await (prisma as any).challengeAttempt.updateMany({
        where: {
          team_id: id,
          status: { not: 'SOLVED' }
        },
        data: {
          is_paused: true,
          paused_at: now,
          status: 'PAUSED',
          last_active_at: now
        }
      });
    } else {
      // Resuming team attempts
      const attempts = await (prisma as any).challengeAttempt.findMany({
        where: { team_id: id, status: { not: 'SOLVED' } }
      });

      for (const att of attempts) {
        let newPausedDuration = att.paused_duration_seconds || 0;
        if (att.paused_at) {
          const diff = Math.max(0, Math.floor((now.getTime() - new Date(att.paused_at).getTime()) / 1000));
          newPausedDuration += diff;
        }
        await (prisma as any).challengeAttempt.update({
          where: { id: att.id },
          data: {
            is_paused: false,
            paused_at: null,
            paused_duration_seconds: newPausedDuration,
            status: att.is_force_stopped ? 'FORCE_STOPPED' : 'IN_PROGRESS',
            last_active_at: now
          }
        });
      }
    }

    broadcastSessionControl({
      action: pauseVal ? 'PAUSE' : 'RESUME',
      attempt_id: '',
      user_id: '',
      team_id: id,
      challenge_id: '',
      event_id: team.event_id,
      is_force_stopped: Boolean(team.is_force_stopped),
      is_paused: pauseVal,
      status: pauseVal ? 'PAUSED' : 'IN_PROGRESS',
      message: pauseVal
        ? `Timer pengerjaan Tim "${team.name}" sedang di-pause oleh Admin.`
        : `Timer pengerjaan Tim "${team.name}" telah dilanjutkan kembali!`
    });

    res.json({
      message: pauseVal ? `Timer Tim "${team.name}" berhasil di-pause!` : `Timer Tim "${team.name}" berhasil dilanjutkan!`,
      team: updatedTeam
    });
  } catch (err: any) {
    console.error('togglePauseTeam error:', err);
    res.status(500).json({ error: 'Gagal mengubah status pause tim', details: err.message });
  }
};



