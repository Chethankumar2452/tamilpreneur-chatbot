// src/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const logger = require('./utils/logger');
const { initSocket } = require('./websocket/socket');
const { PrismaClient } = require('@prisma/client');

// Routes
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const leadRoutes = require('./routes/leads');
const callRoutes = require('./routes/calls');
const knowledgeRoutes = require('./routes/knowledge');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');
const twilioRoutes = require('./routes/twilio');
const elevenLabsRoutes = require('./routes/elevenlabs');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Configure separately for your needs
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ADMIN_URL || 'http://localhost:5174',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Strict limiter for chat (prevent abuse)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please slow down.' },
});

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/twilio', twilioRoutes);       // Twilio webhooks (no auth needed)
app.use('/api/elevenlabs', elevenLabsRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      process.env.ADMIN_URL || 'http://localhost:5174',
    ],
    credentials: true,
  },
});
initSocket(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  try {
    await prisma.$connect();
    logger.info(`✅ Database connected`);
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`🌐 Environment: ${process.env.NODE_ENV}`);
  } catch (err) {
    logger.error('Failed to connect to database:', err);
    process.exit(1);
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

module.exports = { app, io };
