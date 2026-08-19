process.env.TZ = 'Asia/Jakarta';

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initSocket } from './sockets/scoreboardSocket.ts';
import { globalLimiter } from './middlewares/rateLimit.ts';
import { httpLogger } from './middlewares/httpLogger.ts';
import { logger } from './utils/logger.ts';

import authRoutes from './routes/authRoutes.ts';
import teamRoutes from './routes/teamRoutes.ts';
import challengeRoutes from './routes/challengeRoutes.ts';
import scoreboardRoutes from './routes/scoreboardRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';
import writeupRoutes from './routes/writeupRoutes.ts';

import path from 'path';
import fs from 'fs';

// Load single master .env from root, with fallback to local or system environment
const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const localEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO Server
const io = initSocket(server);

import { corsOptions } from './config/cors.js';
import compression from 'compression';

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable Gzip/Deflate compression for high-concurrency API performance
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // optimal CPU to compression ratio
  threshold: 1024 // only compress responses > 1KB
}));

app.use(cors(corsOptions));
// 🛡️ Strict Anti-DoS Payload Limits (1MB maximum for JSON & URL-encoded bodies)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(globalLimiter);
app.use(httpLogger);

// Root and Health check
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/scoreboard', scoreboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/writeup', writeupRoutes);

// Error Handling Middleware (Catches PayloadTooLarge, Invalid JSON & Unhandled Errors)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.type === 'entity.too.large' || err.status === 413) {
    logger.warn('Security', `Blocked Oversized Payload (${req.method} ${req.originalUrl}) from IP ${req.ip}`);
    res.status(413).json({ error: 'Payload terlalu besar. Ukuran request melebihi batas yang diizinkan (Max 1MB).' });
    return;
  }
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Format JSON pada payload tidak valid.' });
    return;
  }
  logger.error('App', `Unhandled Express Error: ${err.message}`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server', `🚀 RISERANGER 2 CTF Engine listening on 0.0.0.0:${PORT}`);
  logger.info('Socket.IO', `🔌 Real-time WebSocket Scoreboard Hub initialized`);
});

export { app, server, io };

