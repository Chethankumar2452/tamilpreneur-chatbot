// src/routes/knowledge.js
const express = require('express');
const router = express.Router();
const {
  reindexWebsite,
  getAllKnowledge,
  addKnowledge,
  updateKnowledge,
  deleteKnowledge,
  getElevenLabsPrompt,
} = require('../controllers/knowledgeController');
const { authenticate } = require('../middleware/auth');

router.post('/reindex', authenticate, reindexWebsite);
router.get('/', authenticate, getAllKnowledge);
router.post('/', authenticate, addKnowledge);
router.put('/:id', authenticate, updateKnowledge);
router.delete('/:id', authenticate, deleteKnowledge);
router.get('/elevenlabs-prompt', authenticate, getElevenLabsPrompt);

module.exports = router;
