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

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO Server
const io = initSocket(server);

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(globalLimiter);
app.use(httpLogger);

// Health check
app.get('/health', (req, res) => {
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info('Server', `🚀 RISERANGER 2 CTF Engine listening on port ${PORT}`);
  logger.info('Socket.IO', `🔌 Real-time WebSocket Scoreboard Hub initialized`);
});

export { app, server, io };

