// src/utils/sessionId.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generates a unique session ID in format GS-2026-XXXXXX
 */
async function generateSessionId() {
  const prefix = process.env.SESSION_PREFIX || 'GS-2026';
  const count = await prisma.chatSession.count();
  const padded = String(count + 1).padStart(6, '0');
  return `${prefix}-${padded}`;
}

module.exports = { generateSessionId };
