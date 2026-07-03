// src/routes/calls.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = status ? { status } : {};

  const [calls, total] = await Promise.all([
    prisma.callLog.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { startedAt: 'desc' },
      include: {
        session: { select: { sessionId: true } },
        recording: { select: { recordingUrl: true, transcript: true, summary: true } },
      },
    }),
    prisma.callLog.count({ where }),
  ]);

  res.json({ calls, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

router.get('/recordings', authenticate, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [recordings, total] = await Promise.all([
    prisma.callRecording.findMany({
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { callLog: { select: { phone: true, status: true, duration: true } } },
    }),
    prisma.callRecording.count(),
  ]);

  res.json({ recordings, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

module.exports = router;
