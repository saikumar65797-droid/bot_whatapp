const { processIncomingMessage } = require('../services/chatbotService');
const { sendMessage } = require('../services/whatsappService');
const { isMessageProcessed, markMessageProcessed } = require('../utils/userState');

/**
 * Verify Webhook (GET /webhook) for Meta WhatsApp Cloud API Setup
 */
const verifyWebhook = (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.VERIFY_TOKEN;

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ Webhook verified successfully by Meta!');
        return res.status(200).send(challenge);
      } else {
        console.warn('❌ Webhook verification failed. Token mismatch.');
        return res.sendStatus(403);
      }
    }

    return res.sendStatus(400);
  } catch (error) {
    console.error('❌ Error in verifyWebhook:', error);
    return res.sendStatus(500);
  }
};

/**
 * Handle incoming WhatsApp Webhook Events (POST /webhook)
 */
const handleWebhook = async (req, res) => {
  // Always return HTTP 200 immediately to acknowledge receipt to Meta
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = req.body;

    // Check if this is an event from a WhatsApp API subscription
    if (body.object !== 'whatsapp_business_account') {
      return;
    }

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    // Ignore status updates (sent, delivered, read receipts)
    if (!messages || messages.length === 0) {
      return;
    }

    const message = messages[0];
    const messageId = message.id;
    const from = message.from; // Sender WhatsApp phone number

    // Ignore duplicate webhook retries from Meta
    if (isMessageProcessed(messageId)) {
      console.log(`⏩ Duplicate message ID ${messageId} ignored.`);
      return;
    }
    markMessageProcessed(messageId);

    let messageData = { text: '', buttonId: '', listRowId: '' };

    if (message.type === 'text' && message.text?.body) {
      messageData.text = message.text.body;
    } else if (message.type === 'interactive') {
      if (message.interactive?.button_reply) {
        messageData.text = message.interactive.button_reply.title || '';
        messageData.buttonId = message.interactive.button_reply.id || '';
      } else if (message.interactive?.list_reply) {
        messageData.text = message.interactive.list_reply.title || '';
        messageData.listRowId = message.interactive.list_reply.id || '';
      }
    } else {
      // Non-supported message format
      await sendMessage(
        from,
        'Please send text messages or select from the options provided to continue. Type *Hi* to restart.'
      );
      return;
    }

    // Process message through chatbot service state machine
    await processIncomingMessage(from, messageData);

  } catch (error) {
    console.error('❌ Error processing WhatsApp webhook event:', error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook
};
