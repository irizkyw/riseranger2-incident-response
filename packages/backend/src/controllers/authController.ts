import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import redis, { cacheSet, cacheGet } from '../config/redis.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { generateTokens } from '../middlewares/auth.ts';
import { generateCaptcha, verifyCaptcha } from '../utils/captcha.js';
import { logger } from '../utils/logger.ts';


export const getCaptcha = async (req: Request, res: Response): Promise<void> => {
  try {
    const captcha = await generateCaptcha();
    res.json(captcha);
  } catch (err) {
    console.error('Generate captcha error:', err);
    res.status(500).json({ error: 'Failed to generate captcha' });
  }
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, captcha_id, captcha_answer } = req.body;

    // Verify Captcha
    const isCaptchaValid = await verifyCaptcha(captcha_id, captcha_answer);
    if (!isCaptchaValid) {
      logger.security('CAPTCHA_FAILED', `Invalid captcha answer submitted during registration attempt for ${username}`);
      res.status(400).json({ error: 'Kode Captcha tidak valid atau telah kadaluarsa. Silakan refresh Captcha.' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      logger.warn('Auth', `Registration conflict: Username or email already in use (${username} / ${email})`);
      res.status(409).json({ error: 'Username atau Email sudah terdaftar' });
      return;
    }

    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        role: 'PARTICIPANT'
      }
    });

    logger.security('USER_REGISTERED', `New operative @${user.username} enlisted (${user.email})`);

    res.status(201).json({
      message: 'Registrasi berhasil! Silakan login.',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error('Auth', 'Register error:', err);
    res.status(500).json({ error: 'Failed to register user' });
  }
};


import { notifyMultipleLoginTerminated } from '../sockets/scoreboardSocket.ts';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
      },
      include: {
        team_member: { include: { team: true } }
      }
    });

    if (!user) {
      logger.security('LOGIN_FAILED', `Account not found for credential: ${usernameOrEmail}`, { ip: String(req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip || '') });
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      logger.security('LOGIN_FAILED', `Incorrect password for user @${user.username}`, { user_id: user.id, username: user.username, ip: String(req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip || '') });
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-real-ip'] || req.ip;

    // If account has an active session from previously, rotate session smoothly (old device will be revoked)
    if ((user as any).active_session_id) {
      logger.security(
        'SESSION_ROTATED',
        `User @${user.username} logged in from IP ${clientIp}. Rotating active session.`,
        { user_id: user.id, username: user.username, ip: String(clientIp || '') }
      );
    }

    // Account is free to login: generate fresh session ID
    const newSessionId = crypto.randomUUID();

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        active_session_id: newSessionId,
        last_ip: String(clientIp || ''),
        last_login_at: new Date()
      } as any
    });

    // Sync active session into Redis for high-speed lookup
    await cacheSet(`active_session:${user.id}`, newSessionId, 'EX', 7 * 86400);

    const tokens = generateTokens(updatedUser);
    logger.security('LOGIN_SUCCESS', `User @${user.username} (${user.role}) authenticated successfully [Session: ${newSessionId.slice(0, 8)}...]`);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        event_id: user.event_id,
        team: user.team_member?.team ? {
          id: user.team_member.team.id,
          name: user.team_member.team.name,
          invite_code: user.team_member.team.invite_code,
          leader_id: user.team_member.team.leader_id,
          score: user.team_member.team.score,
          event_id: user.team_member.team.event_id
        } : null
      },
      ...tokens
    });
  } catch (err) {
    logger.error('Auth', 'Login error:', err);
    res.status(500).json({ error: 'Failed to login' });
  }
};


export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }

    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_ctf_refresh_token_key_2026';
    const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string; username: string; role: string; sessionId?: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } }) as any;
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Anti-Cheat: Reject refresh if token session was reset by admin or does not match active session
    if (decoded.sessionId && (!user.active_session_id || decoded.sessionId !== user.active_session_id)) {
      res.status(401).json({
        code: 'SESSION_REVOKED',
        error: 'Sesi ini telah di-reset . Silakan login kembali.'
      });
      return;
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req: any, res: Response): Promise<void> => {
  try {
    if (req.user?.id) {
      // Clear session in DB
      await prisma.user.update({
        where: { id: req.user.id },
        data: { active_session_id: null } as any
      });
      // Delete Redis key entirely so it cannot false-block next login
      await redis.del(`active_session:${req.user.id}`);
      logger.security('LOGOUT', `User @${req.user.username} logged out and session cleared`);
    }
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to logout' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;

    // Fast-path: Check Redis cache for /auth/me user profile & analytics (TTL 15s)
    const cacheKey = `auth:me:${userId}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    } catch (cacheErr) {
      // Ignore cache error and proceed to DB
    }

    const [user, userSubmissions, userUnlockedHints] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          event_id: true,
          created_at: true,
          event: { select: { id: true, name: true, is_active: true, is_paused: true, is_finished: true, start_time: true, end_time: true, freeze_time: true } },
          team_member: {
            include: {
              team: {
                include: {
                  event: { select: { id: true, name: true, is_active: true, is_paused: true, is_finished: true, start_time: true, end_time: true, freeze_time: true, min_team_size: true } },
                  members: {
                    include: {
                      user: { select: { id: true, username: true, email: true, role: true, created_at: true } }
                    },
                    orderBy: { joined_at: 'asc' }
                  },
                  first_bloods: {
                    include: { challenge: { select: { title: true } } }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.submission.findMany({
        where: { user_id: userId },
        include: {
          challenge: { select: { id: true, title: true, category: true, points: true } }
        },
        orderBy: { submitted_at: 'desc' }
      }),
      (prisma as any).unlockedHint.findMany({
        where: { user_id: userId },
        select: { id: true, cost_deducted: true }
      })
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // 1. Personal Performance Analytics Calculation
    const correctUserSubmissions = userSubmissions.filter((s) => s.is_correct);
    const failedUserSubmissions = userSubmissions.filter((s) => !s.is_correct);
    const personalSolvedCount = correctUserSubmissions.length;
    const personalFailedCount = failedUserSubmissions.length;
    const personalTotalSubmissions = userSubmissions.length;
    const personalScore = correctUserSubmissions.reduce((sum, s) => sum + (s.challenge?.points || 0), 0);
    const personalAccuracy = personalTotalSubmissions > 0 ? Math.round((personalSolvedCount / personalTotalSubmissions) * 100) : 0;
    const personalHintsCount = userUnlockedHints.length;
    const personalHintsCost = userUnlockedHints.reduce((sum: number, h: any) => sum + (h.cost_deducted || 0), 0);

    // Personal Category Mastery Breakdown
    const personalCategoryMap: Record<string, { category: string; count: number; points: number }> = {};
    correctUserSubmissions.forEach((s) => {
      const cat = s.challenge?.category || 'MISC';
      if (!personalCategoryMap[cat]) {
        personalCategoryMap[cat] = { category: cat, count: 0, points: 0 };
      }
      personalCategoryMap[cat].count += 1;
      personalCategoryMap[cat].points += s.challenge?.points || 0;
    });

    const personalCategoryBreakdown = Object.values(personalCategoryMap).map((c) => ({
      ...c,
      percentage: personalScore > 0 ? Math.round((c.points / personalScore) * 100) : 0
    }));

    // 2. Team Performance Analytics (if enrolled in a squad)
    let enrichedTeam: any = null;
    if (user.team_member?.team) {
      const rawTeam = user.team_member.team;
      const teamId = rawTeam.id;

      const [teamSubmissions, teamsWithHigherScore, teamUnlockedHints] = await Promise.all([
        prisma.submission.findMany({
          where: { team_id: teamId },
          include: {
            challenge: { select: { id: true, title: true, category: true, points: true } },
            user: { select: { id: true, username: true } }
          },
          orderBy: { submitted_at: 'desc' }
        }),
        prisma.team.count({
          where: {
            is_banned: false,
            score: { gt: rawTeam.score }
          }
        }),
        (prisma as any).unlockedHint.findMany({
          where: { team_id: teamId },
          select: { id: true, cost_deducted: true }
        })
      ]);

      const correctTeamSubs = teamSubmissions.filter((s) => s.is_correct);
      const failedTeamSubs = teamSubmissions.filter((s) => !s.is_correct);
      const teamTotalSubs = teamSubmissions.length;
      const teamCorrectCount = correctTeamSubs.length;
      const teamFailedCount = failedTeamSubs.length;
      const teamAccuracy = teamTotalSubs > 0 ? Math.round((teamCorrectCount / teamTotalSubs) * 100) : 0;
      const teamHintsCount = teamUnlockedHints.length;
      const teamHintsCost = teamUnlockedHints.reduce((sum: number, h: any) => sum + (h.cost_deducted || 0), 0);

      // Member stats inside the team
      const membersWithStats = rawTeam.members.map((member) => {
        const mSubs = teamSubmissions.filter((s) => s.user_id === member.user.id);
        const mCorrect = mSubs.filter((s) => s.is_correct);
        const mFailed = mSubs.filter((s) => !s.is_correct);
        const mPoints = mCorrect.reduce((sum, s) => sum + (s.challenge?.points || 0), 0);
        const mAcc = mSubs.length > 0 ? Math.round((mCorrect.length / mSubs.length) * 100) : 0;
        const mContrib = rawTeam.score > 0 ? Math.round((mPoints / rawTeam.score) * 100) : 0;

        return {
          ...member,
          score: mPoints,
          solved_count: mCorrect.length,
          failed_count: mFailed.length,
          total_attempts: mSubs.length,
          accuracy_rate: mAcc,
          contribution_percentage: mContrib,
          solved_challenges: mCorrect.map((s) => ({
            id: s.challenge.id,
            title: s.challenge.title,
            category: s.challenge.category,
            points: s.challenge.points,
            solved_at: s.submitted_at
          }))
        };
      });

      // Team Category Breakdown
      const teamCatMap: Record<string, { category: string; count: number; points: number }> = {};
      correctTeamSubs.forEach((s) => {
        const cat = s.challenge?.category || 'MISC';
        if (!teamCatMap[cat]) {
          teamCatMap[cat] = { category: cat, count: 0, points: 0 };
        }
        teamCatMap[cat].count += 1;
        teamCatMap[cat].points += s.challenge?.points || 0;
      });

      const teamCategoryBreakdown = Object.values(teamCatMap).map((c) => ({
        ...c,
        percentage: rawTeam.score > 0 ? Math.round((c.points / rawTeam.score) * 100) : 0
      }));

      enrichedTeam = {
        ...rawTeam,
        rank: teamsWithHigherScore + 1,
        stats: {
          total_submissions: teamTotalSubs,
          correct_submissions: teamCorrectCount,
          failed_submissions: teamFailedCount,
          accuracy_rate: teamAccuracy,
          first_blood_count: rawTeam.first_bloods.length,
          total_solves: teamCorrectCount,
          hints_used_count: teamHintsCount,
          hints_cost_total: teamHintsCost,
          user_contribution_percentage: rawTeam.score > 0 ? Math.round((personalScore / rawTeam.score) * 100) : 0
        },
        members: membersWithStats,
        category_breakdown: teamCategoryBreakdown,
        submissions: correctTeamSubs
      };
    }

    const profileResponse = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      event_id: user.event_id,
      created_at: user.created_at,
      event: user.event,
      team: enrichedTeam,
      stats: {
        personal_score: personalScore,
        solved_count: personalSolvedCount,
        failed_count: personalFailedCount,
        total_submissions: personalTotalSubmissions,
        accuracy_rate: personalAccuracy,
        hints_used_count: personalHintsCount,
        hints_cost_total: personalHintsCost,
        category_breakdown: personalCategoryBreakdown,
        solved_challenges: correctUserSubmissions.map((s) => ({
          id: s.challenge.id,
          title: s.challenge.title,
          category: s.challenge.category,
          points: s.challenge.points,
          solved_at: s.submitted_at
        }))
      }
    };

    // Save in Redis cache for 15s to keep dashboard instant
    try {
      await redis.set(cacheKey, JSON.stringify(profileResponse), 'EX', 15);
    } catch { }

    res.json(profileResponse);
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const joinEvent = async (req: any, res: Response): Promise<void> => {
  try {
    const { join_token } = req.body;
    if (!join_token) {
      res.status(400).json({ error: 'Join token is required' });
      return;
    }

    const tokenStr = String(join_token).trim().toUpperCase();

    // 1. Check if token is a Single-Use / Unique Event Token
    const eventToken = await prisma.eventToken.findUnique({
      where: { token: tokenStr },
      include: { event: true, used_by_user: { select: { username: true } } }
    });

    if (eventToken) {
      if (eventToken.is_used) {
        res.status(400).json({
          error: `Token ini sudah pernah digunakan${eventToken.used_by_user ? ` oleh @${eventToken.used_by_user.username}` : ''} dan tidak dapat dipakai ulang (Hangus)!`
        });
        return;
      }

      if (!eventToken.event.is_active) {
        res.status(403).json({ error: 'Event ini sedang tidak aktif' });
        return;
      }

      // Mark token as used and link user to event in a transaction
      await prisma.$transaction([
        prisma.eventToken.update({
          where: { id: eventToken.id },
          data: {
            is_used: true,
            used_by_user_id: req.user.id,
            used_at: new Date()
          }
        }),
        prisma.user.update({
          where: { id: req.user.id },
          data: { event_id: eventToken.event_id }
        })
      ]);

      res.json({
        message: 'Akses berhasil diverifikasi! Anda telah bergabung ke event.',
        event_id: eventToken.event.id,
        event_name: eventToken.event.name,
        ticket_label: eventToken.label
      });
      return;
    }

    // 2. Fallback: Check static / master Event join_token
    const event = await prisma.event.findFirst({
      where: {
        OR: [
          { join_token: tokenStr },
          { join_token: String(join_token).trim() }
        ]
      }
    });

    if (!event) {
      res.status(404).json({ error: 'Token event tidak valid atau tidak terdaftar!' });
      return;
    }

    if (!event.is_active) {
      res.status(403).json({ error: 'Event ini sedang tidak aktif' });
      return;
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { event_id: event.id }
    });

    res.json({ message: 'Successfully joined event!', event_id: event.id, event_name: event.name });
  } catch (err) {
    console.error('Join event error:', err);
    res.status(500).json({ error: 'Failed to join event' });
  }
};

// User Profile Update
export const updateProfile = async (req: any, res: Response): Promise<void> => {
  try {
    const { username, email } = req.body;
    const userId = req.user.id;

    // Check if user is in an ongoing / started event
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        event: true,
        team_member: { include: { team: { include: { event: true } } } }
      }
    });

    const activeEvent = currentUser?.event || currentUser?.team_member?.team?.event;
    if (activeEvent && currentUser?.role !== 'ADMIN') {
      const now = new Date();
      if (activeEvent.start_time && now >= new Date(activeEvent.start_time)) {
        res.status(403).json({
          error: 'Perubahan profil (username / email) dinonaktifkan karena event kompetisi sedang berjalan demi menjaga integritas kompetisi.'
        });
        return;
      }
    }

    const orConditions: any[] = [];

    if (username) orConditions.push({ username });
    if (email) orConditions.push({ email });

    if (orConditions.length > 0) {
      const existing = await prisma.user.findFirst({
        where: {
          OR: orConditions,
          NOT: { id: userId }
        }
      });

      if (existing) {
        if (existing.username === username) {
          res.status(409).json({ error: 'Username sudah digunakan oleh user lain' });
          return;
        }
        if (existing.email === email) {
          res.status(409).json({ error: 'Email sudah digunakan oleh user lain' });
          return;
        }
        res.status(409).json({ error: 'Username atau Email sudah digunakan oleh user lain' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(username ? { username } : {}),
        ...(email ? { email } : {})
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        event_id: true,
        created_at: true
      }
    });

    res.json({ message: 'Profil berhasil diperbarui', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Gagal memperbarui profil' });
  }
};

// Change Password
export const changePassword = async (req: any, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Password saat ini dan password baru wajib diisi' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password baru minimal 6 karakter' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User tidak ditemukan' });
      return;
    }

    const isMatch = await verifyPassword(currentPassword, user.password_hash);
    if (!isMatch) {
      res.status(400).json({ error: 'Password saat ini tidak cocok!' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash }
    });

    res.json({ message: 'Password berhasil diubah!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Gagal mengubah password' });
  }
};

