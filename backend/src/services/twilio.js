// src/services/twilio.js
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Initiate outbound call via Twilio → ElevenLabs Agent
 */
async function initiateCall(phone, sessionId) {
  try {
    logger.info(`Initiating call to ${phone} for session ${sessionId}`);

    // Create TwiML that connects to ElevenLabs
    const twimlUrl = `${process.env.TWILIO_WEBHOOK_URL}/voice?sessionId=${sessionId}`;
    const statusCallbackUrl = `${process.env.TWILIO_WEBHOOK_URL}/status`;

    const call = await client.calls.create({
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      url: twimlUrl,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: true,
      recordingStatusCallback: `${process.env.TWILIO_WEBHOOK_URL}/recording`,
      recordingStatusCallbackMethod: 'POST',
      timeout: 30,
    });

    // Store call log
    await prisma.callLog.upsert({
      where: { sessionId },
      create: {
        sessionId,
        phone,
        callSid: call.sid,
        status: 'initiated',
        startedAt: new Date(),
      },
      update: {
        callSid: call.sid,
        status: 'initiated',
        startedAt: new Date(),
        retryCount: { increment: 1 },
      },
    });

    // Update lead call status
    await prisma.lead.update({
      where: { sessionId },
      data: { callStatus: 'initiated' },
    });

    logger.info(`Call initiated: SID=${call.sid}`);
    return { success: true, callSid: call.sid };
  } catch (err) {
    logger.error(`Failed to initiate call for ${phone}:`, err.message);

    // Mark as failed
    await prisma.callLog.upsert({
      where: { sessionId },
      create: {
        sessionId,
        phone,
        status: 'failed',
        startedAt: new Date(),
      },
      update: {
        status: 'failed',
        retryCount: { increment: 1 },
      },
    });

    await prisma.lead.update({
      where: { sessionId },
      data: { callStatus: 'failed' },
    }).catch(() => {});

    return { success: false, error: err.message };
  }
}

/**
 * Retry failed call (once)
 */
async function retryCall(sessionId) {
  const callLog = await prisma.callLog.findUnique({ where: { sessionId } });
  if (!callLog) return { success: false, error: 'Call log not found' };
  if (callLog.retryCount >= 2) return { success: false, error: 'Max retries reached' };

  logger.info(`Retrying call for session ${sessionId}`);
  return initiateCall(callLog.phone, sessionId);
}

/**
 * Generate TwiML for Twilio to connect to ElevenLabs
 */
function generateVoiceTwiML(sessionId) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  // ElevenLabs Conversational AI WebSocket URL
  const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">
    Hello! Thank you for your interest in Grand Sangamam. 
    Please hold for a moment while we connect you to our AI assistant.
  </Say>
  <Connect>
    <Stream url="${wsUrl}">
      <Parameter name="session_id" value="${sessionId}" />
    </Stream>
  </Connect>
  <Say voice="Polly.Aditi">
    Thank you for calling Grand Sangamam. Have a great day!
  </Say>
</Response>`;
}

/**
 * Handle call status webhook
 */
async function handleCallStatus(callSid, callStatus, callDuration) {
  try {
    const callLog = await prisma.callLog.findFirst({ where: { callSid } });
    if (!callLog) return;

    const updateData = { status: callStatus.toLowerCase() };

    if (callStatus === 'completed') {
      updateData.endedAt = new Date();
      updateData.duration = parseInt(callDuration) || 0;
    }

    await prisma.callLog.update({
      where: { id: callLog.id },
      data: updateData,
    });

    // Update lead status
    const leadStatus = callStatus === 'completed' ? 'called' :
                       callStatus === 'no-answer' ? 'callback' : 'lost';

    await prisma.lead.update({
      where: { sessionId: callLog.sessionId },
      data: { callStatus: callStatus.toLowerCase(), status: leadStatus },
    }).catch(() => {});

    logger.info(`Call ${callSid} status updated: ${callStatus}`);
  } catch (err) {
    logger.error('Handle call status error:', err);
  }
}

/**
 * Handle recording webhook
 */
async function handleRecording(callSid, recordingUrl, recordingSid, recordingDuration) {
  try {
    const callLog = await prisma.callLog.findFirst({ where: { callSid } });
    if (!callLog) return;

    await prisma.callRecording.upsert({
      where: { callLogId: callLog.id },
      create: {
        callLogId: callLog.id,
        sessionId: callLog.sessionId,
        recordingUrl,
        recordingSid,
        duration: parseInt(recordingDuration) || 0,
      },
      update: {
        recordingUrl,
        recordingSid,
        duration: parseInt(recordingDuration) || 0,
      },
    });

    logger.info(`Recording stored for call ${callSid}`);
  } catch (err) {
    logger.error('Handle recording error:', err);
  }
}

module.exports = {
  initiateCall,
  retryCall,
  generateVoiceTwiML,
  handleCallStatus,
  handleRecording,
};
