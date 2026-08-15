import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';
import { AuthRequest } from './auth.ts';

export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = performance.now();
  const { method, originalUrl } = req;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || req.ip;

  // Hook into response finish event to compute duration and capture user info
  res.on('finish', () => {
    const duration = performance.now() - start;
    const authReq = req as AuthRequest;
    const username = authReq.user?.username;

    // Ignore spammy health check routes in console if needed
    if (originalUrl === '/health') return;

    logger.http(method, originalUrl, res.statusCode, duration, username, ip);
  });

  next();
};
