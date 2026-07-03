// src/routes/twilio.js
const express = require('express');
const router = express.Router();
const { voiceWebhook, statusWebhook, recordingWebhook } = require('../controllers/twilioController');

// Twilio webhooks — NO auth (Twilio calls these)
router.get('/voice', voiceWebhook);
router.post('/voice', voiceWebhook);
router.post('/status', statusWebhook);
router.post('/recording', recordingWebhook);

module.exports = router;
