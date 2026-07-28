import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { initSocket } from './sockets/scoreboardSocket.ts';
import { globalLimiter } from './middlewares/rateLimit.ts';

import authRoutes from './routes/authRoutes.ts';
import teamRoutes from './routes/teamRoutes.ts';
import challengeRoutes from './routes/challengeRoutes.ts';
import scoreboardRoutes from './routes/scoreboardRoutes.ts';
import adminRoutes from './routes/adminRoutes.ts';

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

// Error Handling Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 [Backend] CTF Platform Server running on port ${PORT}`);
  console.log(`🔌 [Socket.IO] Real-time scoreboard ready`);
});

export { app, server, io };
