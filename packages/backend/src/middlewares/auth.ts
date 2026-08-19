import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'ADMIN' | 'PARTICIPANT';
    sessionId?: string | null;
    team_id?: string | null;
    event_id?: string | null;
  };
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'super_secret_ctf_access_token_key_2026';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_ctf_refresh_token_key_2026';

export const generateTokens = (user: { id: string; username: string; role: string; active_session_id?: string | null }) => {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role, sessionId: user.active_session_id || null },
    ACCESS_SECRET,
    { expiresIn: '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role, sessionId: user.active_session_id || null },
    REFRESH_SECRET,
    { expiresIn: '30d' }
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
    const decoded = jwt.verify(token, ACCESS_SECRET) as {
      id: string;
      username: string;
      role: 'ADMIN' | 'PARTICIPANT';
      sessionId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, event_id: true, active_session_id: true } as any
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Account not found' });
      return;
    }

    // Anti-Cheat: Validate that the token's session ID matches current active session ID
    // If session was reset by Admin (active_session_id is null) or mismatched, reject immediately!
    const activeSessionId = (user as any).active_session_id;
    if (decoded.sessionId && (!activeSessionId || decoded.sessionId !== activeSessionId)) {
      res.status(401).json({
        code: 'SESSION_REVOKED',
        error: 'Sesi login Anda telah di-reset atau dicabut . Silakan login kembali.'
      });
      return;
    }

    // Fetch team_id if participant
    const member = await prisma.teamMember.findUnique({
      where: { user_id: decoded.id },
      select: { team_id: true }
    });

    req.user = {
      ...decoded,
      role: decoded.role as any,
      sessionId: decoded.sessionId || null,
      team_id: member?.team_id || null,
      event_id: ((user as any)?.event_id as string) || null
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ACCESS_SECRET) as {
      id: string;
      username: string;
      role: 'ADMIN' | 'PARTICIPANT';
      sessionId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, role: true, event_id: true } as any
    });

    if (user) {
      const member = await prisma.teamMember.findUnique({
        where: { user_id: decoded.id },
        select: { team_id: true }
      });

      req.user = {
        ...decoded,
        role: decoded.role as any,
        sessionId: decoded.sessionId || null,
        team_id: member?.team_id || null,
        event_id: ((user as any)?.event_id as string) || null
      };
    }
  } catch (err) {
    // Ignore token verification failure for optional auth
  }
  next();
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const role = (req.user?.role || '').toUpperCase();
  const allowedStaffRoles = ['ADMIN', 'SUPERADMIN', 'WADMIN', 'JURY', 'MODERATOR', 'HQ'];
  if (!req.user || !allowedStaffRoles.includes(role)) {
    res.status(403).json({ error: 'Forbidden: Admin/Staff access required' });
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
