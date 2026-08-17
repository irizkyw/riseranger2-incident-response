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

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.includes('.trycloudflare.com') ||
      origin.includes('.railway.app') ||
      origin.includes('.up.railway.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);
app.use(httpLogger);

// Root and Health check
app.get('/', (req, res) => {
  res.json({
    name: 'RISERANGER 2 CTF Engine API',
    status: 'ONLINE',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      challenges: '/api/challenges',
      scoreboard: '/api/scoreboard',
      teams: '/api/teams',
      admin: '/api/admin'
    }
  });
});

app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/scoreboard', scoreboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/writeup', writeupRoutes);

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('App', `Unhandled Express Error: ${err.message}`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = Number(process.env.PORT) || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info('Server', `🚀 RISERANGER 2 CTF Engine listening on 0.0.0.0:${PORT}`);
  logger.info('Socket.IO', `🔌 Real-time WebSocket Scoreboard Hub initialized`);
});

export { app, server, io };

