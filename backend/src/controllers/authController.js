// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [{ username }, { email: username }],
        isActive: true,
      },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Invalid password data' });
  }

  try {
    const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
    const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.adminUser.update({
      where: { id: req.admin.id },
      data: { passwordHash: hash },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

async function getProfile(req, res) {
  res.json({ admin: req.admin });
}

module.exports = { login, changePassword, getProfile };
