import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
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
      logger.security('LOGIN_FAILED', `Account not found for credential: ${usernameOrEmail}`);
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      logger.security('LOGIN_FAILED', `Incorrect password for user @${user.username}`);
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const tokens = generateTokens(user);
    logger.security('LOGIN_SUCCESS', `User @${user.username} (${user.role}) authenticated successfully`);

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
    const decoded = jwt.verify(token, REFRESH_SECRET) as { id: string; username: string; role: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  try {
    const [user, solvedCount, totalSubmissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          event_id: true,
          created_at: true,
          event: { select: { id: true, name: true, is_active: true, start_time: true, end_time: true } },
          team_member: {
            include: {
              team: {
                include: {
                  event: { select: { id: true, name: true, is_active: true, start_time: true, end_time: true } },
                  members: { include: { user: { select: { id: true, username: true, email: true } } } }
                }
              }
            }
          }

        }
      }),
      prisma.submission.count({
        where: { user_id: req.user.id, is_correct: true }
      }),
      prisma.submission.count({
        where: { user_id: req.user.id }
      })
    ]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      event_id: user.event_id,
      created_at: user.created_at,
      event: user.event,
      team: user.team_member?.team || null,
      stats: {
        solved_count: solvedCount,
        total_submissions: totalSubmissions
      }
    });
  } catch (err) {
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

