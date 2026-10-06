const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/webhook', (req, res) => whatsappController.verifyWebhook(req, res));
router.post('/webhook', (req, res) => whatsappController.handleIncomingMessage(req, res));

module.exports = router;
