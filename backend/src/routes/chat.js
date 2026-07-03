// src/routes/chat.js
const express = require('express');
const router = express.Router();
const { createSession, streamChat, getChatHistory, endSession, getSuggestedQuestions } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Public routes (chatbot widget)
router.post('/session', createSession);
router.post('/message', streamChat);
router.get('/suggestions', getSuggestedQuestions);
router.delete('/session/:sessionId', endSession);

// Protected (admin)
router.get('/history/:sessionId', authenticate, getChatHistory);

module.exports = router;
