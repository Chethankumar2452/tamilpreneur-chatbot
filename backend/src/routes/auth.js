// src/routes/auth.js
const express = require('express');
const router = express.Router();
const { login, changePassword, getProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, changePassword);

module.exports = router;
