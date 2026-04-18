import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { initSocket } from './socket';
import { startHeartbeatWatchdog } from './jobs/heartbeat';
import { startOrphanCleanup } from './jobs/cleanup';

// Routes
import authRouter from './routes/auth';
import sessionsRouter from './routes/sessions';
import usersRouter from './routes/users';
import friendsRouter from './routes/friends';
import roomsRouter from './routes/rooms';
import messagesRouter from './routes/messages';
import attachmentsRouter from './routes/attachments';
import notificationsRouter from './routes/notifications';

const app = express();
const server = http.createServer(app);

// Ensure uploads directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Security
app.use(helmet());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limit
app.use('/api', apiLimiter);

// Serve static uploads (no-auth — auth check is done at the /api/attachments/:id endpoint)
app.use('/uploads', express.static(path.resolve(config.uploadDir)));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/users', usersRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api', messagesRouter);         // /api/rooms/:id/messages, /api/dialogs/:dialogId/messages, /api/messages/:id
app.use('/api/attachments', attachmentsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use(errorHandler);

// Socket.io
const io = initSocket(server);

// Background jobs
startHeartbeatWatchdog(io);
startOrphanCleanup();

server.listen(config.port, () => {
  console.log(`[Server] Listening on http://localhost:${config.port}`);
});

export { app, server, io };
