const axios = require('axios');

/**
 * Send text message using WhatsApp Cloud API
 * @param {string} to Phone number of recipient (e.g. 919618497846)
 * @param {string} text Message body content
 * @returns {Promise<object|null>} API response or null on failure
 */
const sendMessage = async (to, text) => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !whatsappToken) {
      console.error('⚠️ WhatsApp API credentials missing (PHONE_NUMBER_ID or WHATSAPP_TOKEN)');
      return null;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✉️ Message sent successfully to ${to} (ID: ${response.data?.messages?.[0]?.id || 'N/A'})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Meta WhatsApp API Error [${error.response.status}]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network/Server Error in sendMessage to ${to}: ${error.message}`);
    }
    return null;
  }
};

module.exports = {
  sendMessage
};
