const Customer = require('../models/Customer');
const { sendMessage } = require('../services/whatsappService');
const {
  getUserState,
  setUserState,
  clearUserState,
  isMessageProcessed,
  markMessageProcessed
} = require('../utils/userState');

// Machine options map
const MACHINE_OPTIONS = {
  '1': 'Dal Mill',
  '2': 'Flour Mill',
  '3': 'Rice Mill',
  '4': 'Besan Plant',
  '5': 'Other'
};

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
    const isTriggerWord = ['hi', 'hello', 'hey', 'start'].includes(lowerText);

    let currentState = getUserState(from);

    // If user sends a trigger word or has no active state, start at Welcome / Step 1
    if (isTriggerWord || !currentState) {
      setUserState(from, { step: 1 });
      const welcomeMsg =
        'Welcome to Commas Engineering.\n\n' +
        'Thank you for contacting us.\n\n' +
        'To help us serve you better, please answer a few questions.\n\n' +
        'Please enter your Full Name.';
      await sendMessage(from, welcomeMsg);
      return;
    }

    // Step-by-Step Form Handler
    switch (currentState.step) {
      case 1: {
        // Step 1: User provided Full Name -> Save and ask for Email
        if (!incomingText) {
          await sendMessage(from, 'Name cannot be empty. Please enter your Full Name.');
          return;
        }

        setUserState(from, {
          step: 2,
          name: incomingText
        });

        await sendMessage(from, 'Please enter your Email Address.');
        break;
      }

      case 2: {
        // Step 2: User provided Email -> Validate and ask for Mobile Number
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(incomingText)) {
          await sendMessage(
            from,
            'Invalid email format. Please enter a valid Email Address (e.g. name@example.com).'
          );
          return;
        }

        setUserState(from, {
          step: 3,
          email: incomingText.toLowerCase()
        });

        await sendMessage(from, 'Please enter your Mobile Number.');
        break;
      }

      case 3: {
        // Step 3: User provided Mobile Number -> Validate 10 digits only and ask for Factory Name
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(incomingText)) {
          await sendMessage(
            from,
            'Invalid mobile number. Please enter a valid 10-digit mobile number containing only numbers.'
          );
          return;
        }

        setUserState(from, {
          step: 4,
          phone: incomingText
        });

        await sendMessage(from, 'Please enter your Factory Name.');
        break;
      }

      case 4: {
        // Step 4: User provided Factory Name -> Save and ask for Factory Address
        if (!incomingText) {
          await sendMessage(from, 'Factory name cannot be empty. Please enter your Factory Name.');
          return;
        }

        setUserState(from, {
          step: 5,
          factoryName: incomingText
        });

        await sendMessage(from, 'Please enter your Factory Address.');
        break;
      }

      case 5: {
        // Step 5: User provided Factory Address -> Save and ask for Machine Selection
        if (!incomingText) {
          await sendMessage(from, 'Factory address cannot be empty. Please enter your Factory Address.');
          return;
        }

        setUserState(from, {
          step: 6,
          factoryAddress: incomingText
        });

        const machineMenu =
          'Which machine are you interested in?\n\n' +
          'Reply with the number:\n' +
          '1. Dal Mill\n' +
          '2. Flour Mill\n' +
          '3. Rice Mill\n' +
          '4. Besan Plant\n' +
          '5. Other';

        await sendMessage(from, machineMenu);
        break;
      }

      case 6: {
        // Step 6: Machine Selection
        let selectedMachine = MACHINE_OPTIONS[incomingText];

        // If not matching numeric 1-5, check if user typed exact machine name
        if (!selectedMachine) {
          const matchedKey = Object.values(MACHINE_OPTIONS).find(
            (val) => val.toLowerCase() === lowerText
          );
          if (matchedKey) {
            selectedMachine = matchedKey;
          }
        }

        if (!selectedMachine) {
          const invalidMsg =
            'Invalid selection. Please reply with a number from 1 to 5:\n\n' +
            '1. Dal Mill\n' +
            '2. Flour Mill\n' +
            '3. Rice Mill\n' +
            '4. Besan Plant\n' +
            '5. Other';
          await sendMessage(from, invalidMsg);
          return;
        }

        // Complete data object
        const customerData = {
          name: currentState.name,
          email: currentState.email,
          phone: currentState.phone,
          factoryName: currentState.factoryName,
          factoryAddress: currentState.factoryAddress,
          machineType: selectedMachine
        };

        // Step 7: Save into MongoDB
        await Customer.create(customerData);
        console.log(`✅ Saved new enquiry for ${customerData.name} (${customerData.phone})`);

        // Send final thank you message
        const finalMsg =
          'Thank you.\n\n' +
          'Your enquiry has been registered successfully.\n\n' +
          'Our sales team will contact you shortly.';

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
          'Welcome to Commas Engineering.\n\nThank you for contacting us.\n\nPlease enter your Full Name.'
        );
        break;
      }
    }
  } catch (error) {
    console.error('❌ Error processing WhatsApp webhook event:', error);
    // Never crash the server
  }
};

module.exports = {
  verifyWebhook,
  handleWebhook
};
