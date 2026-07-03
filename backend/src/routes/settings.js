// src/routes/settings.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  const settings = await prisma.appSettings.findMany({
    where: { encrypted: false },
  });
  const map = {};
  settings.forEach(s => { map[s.key] = s.value; });
  res.json({ settings: map });
});

router.put('/', authenticate, async (req, res) => {
  const { settings } = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ error: 'Invalid settings data' });
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await prisma.appSettings.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

module.exports = router;
