const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.get('/', (req, res) => whatsappController.verifyWebhook(req, res));
router.post('/', (req, res) => whatsappController.handleIncomingMessage(req, res));

module.exports = router;
