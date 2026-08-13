const Customer = require('../models/Customer');
const { sendMessage } = require('../services/whatsappService');
const {
  getUserState,
  setUserState,
  clearUserState,
  isMessageProcessed,
  markMessageProcessed
} = require('../utils/userState');

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

    // Only process text messages (handle non-text gracefully)
    if (message.type !== 'text' || !message.text?.body) {
      await sendMessage(
        from,
        'Please send text messages only to complete your enquiry form. Type *Hi* to restart.'
      );
      return;
    }

    const incomingText = message.text.body.trim();
    const lowerText = incomingText.toLowerCase();

    // Check for explicit restart triggers
    const isTriggerWord = ['hi', 'hello', 'hey', 'start', 'restart'].includes(lowerText);

    let currentState = getUserState(from);

    // If user sends a trigger word or has no active state, start at Welcome / Step 1
    if (isTriggerWord || !currentState) {
      setUserState(from, { step: 1 });
      const welcomeMsg =
        'Thank you for contacting Sruthi Technologies!\n' +
        'To help you better, I need a few details.\n\n' +
        'What is your name?';
      await sendMessage(from, welcomeMsg);
      return;
    }

    // Step-by-Step Form Handler
    switch (currentState.step) {
      case 1: {
        // Step 1: User provided Name -> Save and ask for Email
        if (!incomingText) {
          await sendMessage(from, 'Name cannot be empty. May I know your name?');
          return;
        }

        setUserState(from, {
          step: 2,
          name: incomingText
        });

        await sendMessage(from, `Thank you, ${incomingText}.\nPlease provide your email address.`);
        break;
      }

      case 2: {
        // Step 2: User provided Email -> Validate and ask for Mobile Number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(incomingText)) {
          await sendMessage(
            from,
            'Invalid email format. Please provide a valid email address.'
          );
          return;
        }

        setUserState(from, {
          step: 3,
          email: incomingText.toLowerCase()
        });

        await sendMessage(from, 'Thank you.\nPlease provide your mobile number.');
        break;
      }

      case 3: {
        // Step 3: User provided Mobile Number -> Validate 10 digits and ask for Factory/Company Name
        const cleanPhone = incomingText.replace(/[\s\-\+]/g, '');
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(cleanPhone)) {
          await sendMessage(
            from,
            'Invalid mobile number. Please provide a valid 10-digit mobile number.'
          );
          return;
        }

        setUserState(from, {
          step: 4,
          phone: cleanPhone
        });

        await sendMessage(from, 'What is your factory/company name?');
        break;
      }

      case 4: {
        // Step 4: User provided Factory/Company Name -> Save and ask for Factory Address
        if (!incomingText) {
          await sendMessage(from, 'Factory/company name cannot be empty. What is your factory/company name?');
          return;
        }

        setUserState(from, {
          step: 5,
          factoryName: incomingText
        });

        await sendMessage(from, 'Please provide your factory address.');
        break;
      }

      case 5: {
        // Step 5: User provided Factory Address -> Save and ask for Machine Type
        if (!incomingText) {
          await sendMessage(from, 'Factory address cannot be empty. Please provide your factory address.');
          return;
        }

        setUserState(from, {
          step: 6,
          factoryAddress: incomingText
        });

        await sendMessage(from, 'What type of machine are you looking for?');
        break;
      }

      case 6: {
        // Step 6: User provided Machine Type -> Save to DB and complete flow
        if (!incomingText) {
          await sendMessage(from, 'Machine type cannot be empty. What type of machine are you looking for?');
          return;
        }

        const customerData = {
          name: currentState.name,
          email: currentState.email,
          phone: currentState.phone,
          factoryName: currentState.factoryName,
          factoryAddress: currentState.factoryAddress,
          machineType: incomingText
        };

        // Save into MongoDB
        await Customer.create(customerData);
        console.log(`✅ Saved new enquiry for ${customerData.name} (${customerData.phone})`);

        // Send final confirmation message
        const finalMsg =
          'Thank you! We have received your details.\n' +
          'Our team will contact you shortly.';

        await sendMessage(from, finalMsg);

        // Clear user state after successful completion
        clearUserState(from);
        break;
      }

      default: {
        // Fallback reset
        clearUserState(from);
        setUserState(from, { step: 1 });
        await sendMessage(
          from,
          'Hello! Welcome to Sruthi Technologies.\nTo help you better, I need a few details.\n\nMay I know your name?'
        );
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error processing WhatsApp webhook event:', error);
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook
};

