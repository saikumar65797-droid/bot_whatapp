const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/webhookController');

// Meta Webhook Verification Endpoint
router.get('/webhook', verifyWebhook);

// Meta Incoming WhatsApp Webhook Events Endpoint
router.post('/webhook', handleWebhook);

module.exports = router;
