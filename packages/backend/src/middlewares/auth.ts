import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'ADMIN' | 'PARTICIPANT';
    team_id?: string | null;
    event_id?: string | null;
  };
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_ctf_access_token_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_ctf_refresh_token_key_2026';

export const generateTokens = (user: { id: string; username: string; role: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ACCESS_SECRET) as { id: string; username: string; role: 'ADMIN' | 'PARTICIPANT' };

    // Fetch team_id if participant
    const member = await prisma.teamMember.findUnique({
      where: { user_id: decoded.id },
      select: { team_id: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { event_id: true }
    });

    req.user = {
      ...decoded,
      team_id: member?.team_id || null,
      event_id: user?.event_id || null
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
    return;
  }
  next();
};

export const requireTeam = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.team_id) {
    res.status(403).json({ error: 'Forbidden: You must join a team to perform this action' });
    return;
  }
  next();
};
