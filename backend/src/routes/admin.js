// src/routes/admin.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all admin users
router.get('/users', authenticate, async (req, res) => {
  const admins = await prisma.adminUser.findMany({
    select: { id: true, username: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
  });
  res.json({ admins });
});

// Create admin user
router.post('/users', authenticate, async (req, res) => {
  const { username, email, password, role = 'admin' } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.adminUser.create({
      data: { username, email, passwordHash, role },
      select: { id: true, username: true, email: true, role: true },
    });
    res.json({ admin });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Failed to create admin' });
  }
});

// Get all sessions with messages
router.get('/sessions', authenticate, async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (search) where.sessionId = { contains: search };

  const [sessions, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        lead: { select: { phone: true, status: true } },
      },
    }),
    prisma.chatSession.count({ where }),
  ]);

  res.json({ sessions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// Get single session with full conversation
router.get('/sessions/:sessionId', authenticate, async (req, res) => {
  const session = await prisma.chatSession.findUnique({
    where: { sessionId: req.params.sessionId },
    include: {
      messages: { orderBy: { timestamp: 'asc' } },
      lead: true,
      callLog: { include: { recording: true } },
    },
  });

  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ session });
});

// Get audit logs
router.get('/audit-logs', authenticate, async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { admin: { select: { username: true } } },
  });
  res.json({ logs });
});

module.exports = router;
