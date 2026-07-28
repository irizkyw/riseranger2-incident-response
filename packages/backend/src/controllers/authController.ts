import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';
import { generateTokens } from '../middlewares/auth.ts';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existingUser) {
      res.status(409).json({ error: 'Username or Email already in use' });
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

    res.status(201).json({
      message: 'User registered successfully. Please login.',
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Register error:', err);
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
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username/email or password' });
      return;
    }

    const tokens = generateTokens(user);
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
    console.error('Login error:', err);
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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        event_id: true,
        event: { select: { id: true, name: true, is_active: true } },
        team_member: {
          include: {
            team: {
              include: {
                members: { include: { user: { select: { id: true, username: true } } } }
              }
            }
          }
        }
      }
    });

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
      event: user.event,
      team: user.team_member?.team || null
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

    const event = await prisma.event.findUnique({
      where: { join_token }
    });

    if (!event) {
      res.status(404).json({ error: 'Invalid join token' });
      return;
    }

    if (!event.is_active) {
      res.status(403).json({ error: 'This event is currently inactive' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { event_id: event.id }
    });

    res.json({ message: 'Successfully joined event!', event_id: event.id, event_name: event.name });
  } catch (err) {
    console.error('Join event error:', err);
    res.status(500).json({ error: 'Failed to join event' });
  }
};
