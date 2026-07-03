// src/routes/elevenlabs.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get ElevenLabs agent details
router.get('/agent', authenticate, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/agents/${process.env.ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    logger.error('ElevenLabs agent fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch agent details' });
  }
});

// Get conversations from ElevenLabs
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${process.env.ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } }
    );
    res.json(response.data);
  } catch (err) {
    logger.error('ElevenLabs conversations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
