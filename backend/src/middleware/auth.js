// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    logger.error('Auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

const requireRole = (role) => (req, res, next) => {
  if (req.admin?.role !== role && req.admin?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

module.exports = { authenticate, requireRole };
