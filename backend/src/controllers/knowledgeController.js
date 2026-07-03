// src/controllers/knowledgeController.js
const { PrismaClient } = require('@prisma/client');
const { crawlWebsite } = require('../services/crawler');
const { generateElevenLabsPrompt } = require('../services/gemini');
const logger = require('../utils/logger');
const { getIO } = require('../websocket/socket');

const prisma = new PrismaClient();

let crawlInProgress = false;

async function reindexWebsite(req, res) {
  if (crawlInProgress) {
    return res.status(409).json({ error: 'Crawl already in progress' });
  }

  crawlInProgress = true;
  const io = getIO();

  res.json({ message: 'Crawl started. You will receive updates via WebSocket.' });

  try {
    const result = await crawlWebsite((progress) => {
      if (io) io.to('admins').emit('crawl_progress', progress);
    });

    crawlInProgress = false;
    if (io) io.to('admins').emit('crawl_complete', result);
  } catch (err) {
    crawlInProgress = false;
    logger.error('Crawl error:', err);
    if (io) io.to('admins').emit('crawl_error', { error: err.message });
  }
}

async function getAllKnowledge(req, res) {
  const { page = 1, limit = 20, category, source, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = { isActive: true };
  if (category) where.category = category;
  if (source) where.source = source;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [knowledge, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, url: true, category: true, source: true, createdAt: true, content: true },
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    res.json({ knowledge, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    logger.error('Get knowledge error:', err);
    res.status(500).json({ error: 'Failed to fetch knowledge' });
  }
}

async function addKnowledge(req, res) {
  const { title, content, category, url } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const item = await prisma.knowledgeBase.create({
      data: { title, content, category: category || 'general', url, source: 'manual', embedding: [] },
    });
    res.json({ item });
  } catch (err) {
    logger.error('Add knowledge error:', err);
    res.status(500).json({ error: 'Failed to add knowledge' });
  }
}

async function updateKnowledge(req, res) {
  const { id } = req.params;
  const { title, content, category, isActive } = req.body;

  try {
    const item = await prisma.knowledgeBase.update({
      where: { id },
      data: { title, content, category, isActive },
    });
    res.json({ item });
  } catch (err) {
    logger.error('Update knowledge error:', err);
    res.status(500).json({ error: 'Failed to update knowledge' });
  }
}

async function deleteKnowledge(req, res) {
  const { id } = req.params;

  try {
    await prisma.knowledgeBase.update({
      where: { id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) {
    logger.error('Delete knowledge error:', err);
    res.status(500).json({ error: 'Failed to delete knowledge' });
  }
}

async function getElevenLabsPrompt(req, res) {
  try {
    const prompt = await generateElevenLabsPrompt();
    res.json({ prompt });
  } catch (err) {
    logger.error('ElevenLabs prompt error:', err);
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
}

module.exports = {
  reindexWebsite,
  getAllKnowledge,
  addKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getElevenLabsPrompt,
};
