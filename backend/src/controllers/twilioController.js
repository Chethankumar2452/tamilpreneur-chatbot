// src/controllers/twilioController.js
const twilio = require('twilio');
const { generateVoiceTwiML, handleCallStatus, handleRecording } = require('../services/twilio');
const logger = require('../utils/logger');
const { getIO } = require('../websocket/socket');

/**
 * Generate TwiML for outbound call — connects caller to ElevenLabs AI
 */
function voiceWebhook(req, res) {
  const { sessionId } = req.query;
  logger.info(`Voice webhook called for session: ${sessionId}`);

  const twiml = generateVoiceTwiML(sessionId || 'unknown');
  res.type('text/xml').send(twiml);
}

/**
 * Handle call status updates from Twilio
 */
async function statusWebhook(req, res) {
  const { CallSid, CallStatus, CallDuration } = req.body;
  logger.info(`Call status webhook: ${CallSid} → ${CallStatus}`);

  await handleCallStatus(CallSid, CallStatus, CallDuration);

  // Emit to admin dashboard
  const io = getIO();
  if (io) {
    io.to('admins').emit('call_status_update', {
      callSid: CallSid,
      status: CallStatus,
      duration: CallDuration,
    });
  }

  res.sendStatus(200);
}

/**
 * Handle recording callback
 */
async function recordingWebhook(req, res) {
  const { CallSid, RecordingUrl, RecordingSid, RecordingDuration } = req.body;
  logger.info(`Recording webhook: ${CallSid}`);

  await handleRecording(CallSid, RecordingUrl, RecordingSid, RecordingDuration);
  res.sendStatus(200);
}

module.exports = { voiceWebhook, statusWebhook, recordingWebhook };
