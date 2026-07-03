// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const { getDashboardStats, getVisitorTrend, getPopularQuestions } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, getDashboardStats);
router.get('/trend', authenticate, getVisitorTrend);
router.get('/questions', authenticate, getPopularQuestions);

module.exports = router;
