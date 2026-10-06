const env = require('../config/env');
const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const { textMessage, interactiveButtons } = require('../utils/responseFormatter');
const logger = require('../utils/logger');

// Flows
const existingCustomerFlow = require('../flows/existingCustomerFlow');
const ticketFlow = require('../flows/ticketFlow');
const amcFlow = require('../flows/amcFlow');
const newMachineFlow = require('../flows/newMachineFlow');
const newCustomerFlow = require('../flows/newCustomerFlow');
const enquiryFlow = require('../flows/enquiryFlow');

// Simple in-memory cache for idempotency
const processedMessages = new Set();

// Periodically clean up idempotency cache to prevent memory leak
setInterval(() => {
  processedMessages.clear();
}, 1000 * 60 * 60); // Clear every hour

class WhatsAppController {
  verifyWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === env.verifyToken) {
        logger.info('Webhook verified successfully');
        return res.status(200).send(challenge);
      }
      logger.warn('Webhook verification failed');
      return res.sendStatus(403);
    }
    return res.sendStatus(400);
  }

  async handleIncomingMessage(req, res) {
    try {
      const { body } = req;
      
      if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
          
          const message = body.entry[0].changes[0].value.messages[0];
          const messageId = message.id;
          
          // Idempotency check
          if (processedMessages.has(messageId)) {
            logger.info(`Duplicate message received: ${messageId}`);
            return res.status(200).send('OK');
          }
          processedMessages.add(messageId);
          
          const from = message.from;
          await whatsappService.markAsRead(messageId);

          // Extract text from text, button, or list replies
          let textMsg = '';
          if (message.type === 'text') {
            textMsg = message.text.body;
          } else if (message.type === 'interactive') {
            if (message.interactive.type === 'button_reply') {
              // Usually we can map ID or Title. 
              textMsg = message.interactive.button_reply.id;
              // Some logic expects title string, so let's fallback to id if title isn't sufficient. 
              // But our flows check for both ID (e.g., 'yes', 'no', 'try_again') and Title if needed.
              // Wait, ID is safer.
              textMsg = message.interactive.button_reply.id;
            } else if (message.interactive.type === 'list_reply') {
              textMsg = message.interactive.list_reply.id; // We set IDs as the actual value in our formatters
            }
          }

          if (!textMsg) {
            return res.status(200).send('OK'); // Unhandled message type
          }

          let session = await sessionService.getSession(from);

          // Global commands
          const globalCommand = textMsg.toLowerCase().trim();
          if (['menu', 'back', 'cancel', 'help', 'restart'].includes(globalCommand)) {
            if (globalCommand === 'cancel' || globalCommand === 'restart') {
              await sessionService.clearSession(from);
              session = await sessionService.getSession(from); // Refresh state to START
            } else if (globalCommand === 'menu' && session.companyProfileId) {
              await sessionService.updateSession(from, { state: 'MAIN_MENU' });
              await existingCustomerFlow.sendMainMenu(from);
              return res.status(200).send('OK');
            } else if (globalCommand === 'menu') {
               // Cannot show main menu if not verified
               await sessionService.clearSession(from);
               session = await sessionService.getSession(from);
            }
            // Add custom back logic if needed, but restart is safest generic
          }

          await this.routeMessageToFlow(session, textMsg, from);
        }
        res.status(200).send('OK');
      } else {
        res.sendStatus(404);
      }
    } catch (error) {
      logger.error('Error handling incoming message:', error.message);
      res.status(500).send('Error');
    }
  }

  async routeMessageToFlow(session, textMsg, from) {
    if (session.state === 'START') {
      const msg = 'Hello 👋\nWelcome to Sruthi Technologies.\nThank you for contacting us.\n\nAre you an existing customer?';
      await whatsappService.sendMessage(interactiveButtons(from, msg, [
        { id: 'yes', title: 'YES' },
        { id: 'no', title: 'NO' }
      ]));
      await sessionService.updateSession(from, { state: 'CHECK_EXISTING' });
      return;
    }

    if (session.state === 'CHECK_EXISTING') {
      const text = textMsg.toLowerCase();
      if (['yes', 'y', '1'].includes(text)) {
        await sessionService.updateSession(from, { state: 'EXISTING_CUSTOMER' });
        // Forward immediately to next step
        const s = await sessionService.getSession(from);
        await existingCustomerFlow.handleExistingCustomerFlow(s, textMsg, from);
      } else if (['no', 'n', '2'].includes(text)) {
        await sessionService.updateSession(from, { state: 'NEW_CUSTOMER_NAME' });
        await whatsappService.sendMessage(textMessage(from, 'Please enter your name.'));
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Please select a valid option (Yes or No).'));
      }
      return;
    }

    if (['EXISTING_CUSTOMER', 'ENTER_MOBILE', 'MOBILE_NOT_FOUND', 'ENTER_EMAIL', 'SERIAL_VERIFICATION', 'PROFILE_CONFIRMATION'].includes(session.state)) {
      await existingCustomerFlow.handleExistingCustomerFlow(session, textMsg, from);
      return;
    }

    if (session.state === 'MAIN_MENU') {
      const val = textMsg.toLowerCase();
      if (val === 'raise_ticket' || val === 'raise a ticket' || val === '1') {
        await sessionService.updateSession(from, { state: 'SELECT_TICKET_MACHINE' });
        const s = await sessionService.getSession(from);
        await ticketFlow.handleTicketFlow(s, textMsg, from);
      } else if (val === 'buy_amc' || val === 'buy / renew amc' || val === '2') {
        await sessionService.updateSession(from, { state: 'SELECT_AMC_MACHINE' });
        const s = await sessionService.getSession(from);
        await amcFlow.handleAmcFlow(s, textMsg, from);
      } else if (val === 'new_machine' || val === 'request a new machine' || val === '3') {
        await sessionService.updateSession(from, { state: 'NEW_MACHINE_TYPE' });
        await newMachineFlow.askMachineType(from);
      } else if (val === 'enquiry' || val === '4') {
        await sessionService.updateSession(from, { state: 'ENQUIRY_TYPE' });
        await enquiryFlow.askEnquiryType(from);
      } else {
        await existingCustomerFlow.sendMainMenu(from);
      }
      return;
    }

    if (session.state.startsWith('SELECT_TICKET_MACHINE') || session.state.startsWith('SELECT_CALL_TYPE') || session.state.startsWith('SELECT_CATEGORY') || session.state.startsWith('SELECT_PRIORITY') || session.state.startsWith('ENTER_DESCRIPTION') || session.state.startsWith('TICKET_CONFIRMATION')) {
      await ticketFlow.handleTicketFlow(session, textMsg, from);
      return;
    }

    if (session.state.startsWith('SELECT_AMC_MACHINE') || session.state.startsWith('AMC_PLAN_SELECTION') || session.state.startsWith('AMC_CONFIRMATION')) {
      await amcFlow.handleAmcFlow(session, textMsg, from);
      return;
    }

    if (session.state.startsWith('NEW_MACHINE_')) {
      await newMachineFlow.handleNewMachineFlow(session, textMsg, from);
      return;
    }

    if (session.state.startsWith('NEW_CUSTOMER_')) {
      await newCustomerFlow.handleNewCustomerFlow(session, textMsg, from);
      return;
    }

    if (session.state.startsWith('ENQUIRY_')) {
      await enquiryFlow.handleEnquiryFlow(session, textMsg, from);
      return;
    }

    // Default fallback
    await sessionService.clearSession(from);
    await this.routeMessageToFlow(await sessionService.getSession(from), textMsg, from);
  }
}

module.exports = new WhatsAppController();
