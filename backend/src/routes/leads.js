// src/routes/leads.js
const express = require('express');
const router = express.Router();
const { submitLead, validateLead, getAllLeads, updateLead, retryLeadCall } = require('../controllers/leadController');
const { authenticate } = require('../middleware/auth');

// Public (chatbot)
router.post('/', validateLead, submitLead);

// Admin protected
router.get('/', authenticate, getAllLeads);
router.put('/:id', authenticate, updateLead);
router.post('/:id/retry-call', authenticate, retryLeadCall);

module.exports = router;
