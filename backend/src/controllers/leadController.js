// src/controllers/leadController.js
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const { initiateCall, retryCall } = require('../services/twilio');
const logger = require('../utils/logger');
const { getIO } = require('../websocket/socket');

const prisma = new PrismaClient();

/**
 * Submit a lead (phone number collected from chatbot)
 */
async function submitLead(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { sessionId, phone, name, question } = req.body;

  try {
    // Check if lead already exists for this session
    const existingLead = await prisma.lead.findUnique({ where: { sessionId } });

    const lead = existingLead
      ? await prisma.lead.update({
          where: { sessionId },
          data: { phone, name, question, status: 'new' },
        })
      : await prisma.lead.create({
          data: { sessionId, phone, name, question, status: 'new' },
        });

    logger.info(`Lead submitted: ${phone} for session ${sessionId}`);

    // Emit to admin dashboard via Socket.IO
    const io = getIO();
    if (io) {
      io.to('admins').emit('new_lead', {
        sessionId,
        phone,
        name,
        createdAt: lead.createdAt,
      });
    }

    // Initiate automatic call (with 2-second delay)
    setTimeout(async () => {
      const result = await initiateCall(phone, sessionId);
      logger.info(`Auto-call result for ${phone}: ${JSON.stringify(result)}`);

      // If first call failed, retry once after 10 seconds
      if (!result.success) {
        setTimeout(async () => {
          logger.info(`Retrying call for ${phone}`);
          await retryCall(sessionId);
        }, 10000);
      }
    }, 2000);

    res.json({
      success: true,
      message: 'Thank you! Our team will call you within a minute.',
      leadId: lead.id,
    });
  } catch (err) {
    logger.error('Submit lead error:', err);
    res.status(500).json({ error: 'Failed to save your information' });
  }
}

/**
 * Lead validation rules
 */
const validateLead = [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('phone')
    .matches(/^(\+91|91|0)?[6-9]\d{9}$/)
    .withMessage('Please enter a valid Indian mobile number'),
  body('name').optional().trim().isLength({ max: 100 }),
];

// ─── Admin Routes ──────────────────────────────────────────────────────────────

async function getAllLeads(req, res) {
  const { page = 1, limit = 20, status, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: { sessionId: true, device: true, country: true },
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    logger.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
}

async function updateLead(req, res) {
  const { id } = req.params;
  const { status, assignedTo, followUpDate, notes, callStatus } = req.body;

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status, assignedTo, followUpDate: followUpDate ? new Date(followUpDate) : undefined, notes, callStatus },
    });
    res.json({ lead });
  } catch (err) {
    logger.error('Update lead error:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
}

async function retryLeadCall(req, res) {
  const { id } = req.params;

  try {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const result = await retryCall(lead.sessionId);
    res.json(result);
  } catch (err) {
    logger.error('Retry call error:', err);
    res.status(500).json({ error: 'Failed to retry call' });
  }
}

module.exports = { submitLead, validateLead, getAllLeads, updateLead, retryLeadCall };
