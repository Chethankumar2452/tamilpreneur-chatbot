// src/controllers/analyticsController.js
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function getDashboardStats(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalVisitors,
      todayVisitors,
      activeChats,
      completedChats,
      totalLeads,
      todayLeads,
      callsToday,
      answeredCalls,
      missedCalls,
    ] = await Promise.all([
      prisma.chatSession.count(),
      prisma.chatSession.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.chatSession.count({ where: { status: 'active' } }),
      prisma.chatSession.count({ where: { status: 'completed' } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
      prisma.callLog.count({ where: { startedAt: { gte: today, lt: tomorrow } } }),
      prisma.callLog.count({ where: { status: 'completed', startedAt: { gte: today, lt: tomorrow } } }),
      prisma.callLog.count({ where: { status: { in: ['failed', 'no-answer', 'busy'] }, startedAt: { gte: today, lt: tomorrow } } }),
    ]);

    // Average chat duration
    const sessions = await prisma.chatSession.findMany({
      where: { duration: { not: null } },
      select: { duration: true },
    });
    const avgChatTime = sessions.length
      ? Math.round(sessions.reduce((a, b) => a + (b.duration || 0), 0) / sessions.length)
      : 0;

    // Average call duration
    const calls = await prisma.callLog.findMany({
      where: { duration: { not: null } },
      select: { duration: true },
    });
    const avgCallDuration = calls.length
      ? Math.round(calls.reduce((a, b) => a + (b.duration || 0), 0) / calls.length)
      : 0;

    const conversionRate = totalVisitors > 0
      ? ((totalLeads / totalVisitors) * 100).toFixed(1)
      : 0;

    res.json({
      totalVisitors,
      todayVisitors,
      activeChats,
      completedChats,
      totalLeads,
      todayLeads,
      callsToday,
      answeredCalls,
      missedCalls,
      avgChatTime,
      avgCallDuration,
      conversionRate: parseFloat(conversionRate),
    });
  } catch (err) {
    logger.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

async function getVisitorTrend(req, res) {
  const { period = 'weekly' } = req.query;
  const days = period === 'monthly' ? 30 : period === 'yearly' ? 365 : 7;

  try {
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [visitors, leads, calls] = await Promise.all([
        prisma.chatSession.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.lead.count({ where: { createdAt: { gte: date, lt: nextDate } } }),
        prisma.callLog.count({ where: { startedAt: { gte: date, lt: nextDate } } }),
      ]);

      result.push({
        date: date.toISOString().split('T')[0],
        visitors,
        leads,
        calls,
      });
    }

    res.json({ data: result });
  } catch (err) {
    logger.error('Visitor trend error:', err);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
}

async function getPopularQuestions(req, res) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sender: 'user' },
      select: { message: true },
      take: 500,
      orderBy: { timestamp: 'desc' },
    });

    // Simple keyword frequency analysis
    const keywords = {};
    messages.forEach(msg => {
      const words = msg.message.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3);

      words.forEach(word => {
        keywords[word] = (keywords[word] || 0) + 1;
      });
    });

    const topKeywords = Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([word, count]) => ({ word, count }));

    res.json({ popularKeywords: topKeywords, totalMessages: messages.length });
  } catch (err) {
    logger.error('Popular questions error:', err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
}

module.exports = { getDashboardStats, getVisitorTrend, getPopularQuestions };
