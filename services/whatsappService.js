const axios = require('axios');

/**
 * Send text message using WhatsApp Cloud API
 * @param {string} to Phone number of recipient (e.g. 919618497846)
 * @param {string} text Message body content
 * @returns {Promise<object|null>}
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

    console.log(`✉️ Text message sent to ${to} (ID: ${response.data?.messages?.[0]?.id || 'N/A'})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Meta WhatsApp API Error [${error.response.status}]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network Error in sendMessage to ${to}: ${error.message}`);
    }
    return null;
  }
};

/**
 * Send interactive reply buttons using WhatsApp Cloud API
 * @param {string} to Phone number of recipient
 * @param {string} bodyText Message text
 * @param {Array<{id: string, title: string}>} buttons Array of buttons (max 3)
 * @returns {Promise<object|null>}
 */
const sendButtonsMessage = async (to, bodyText, buttons) => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !whatsappToken) {
      console.error('⚠️ WhatsApp API credentials missing (PHONE_NUMBER_ID or WHATSAPP_TOKEN)');
      return null;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const formattedButtons = buttons.map(btn => ({
      type: 'reply',
      reply: {
        id: btn.id,
        title: btn.title.slice(0, 20)
      }
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: formattedButtons
        }
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✉️ Buttons sent to ${to} (ID: ${response.data?.messages?.[0]?.id || 'N/A'})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Meta WhatsApp API Error [${error.response.status}]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network Error in sendButtonsMessage to ${to}: ${error.message}`);
    }
    return null;
  }
};

/**
 * Send interactive list message using WhatsApp Cloud API
 * @param {string} to Phone number of recipient
 * @param {string} headerText Header title
 * @param {string} bodyText Body text
 * @param {string} buttonText Action button text (e.g. 'Select Option')
 * @param {Array<{title: string, rows: Array<{id: string, title: string, description?: string}>}>} sections
 * @returns {Promise<object|null>}
 */
const sendListMessage = async (to, headerText, bodyText, buttonText, sections) => {
  try {
    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId || !whatsappToken) {
      console.error('⚠️ WhatsApp API credentials missing (PHONE_NUMBER_ID or WHATSAPP_TOKEN)');
      return null;
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

    const formattedSections = sections.map(sec => ({
      title: sec.title.slice(0, 24),
      rows: sec.rows.map(r => ({
        id: r.id,
        title: r.title.slice(0, 24),
        description: r.description ? r.description.slice(0, 72) : undefined
      }))
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: headerText ? { type: 'text', text: headerText.slice(0, 60) } : undefined,
        body: {
          text: bodyText
        },
        action: {
          button: (buttonText || 'Select Option').slice(0, 20),
          sections: formattedSections
        }
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✉️ List message sent to ${to} (ID: ${response.data?.messages?.[0]?.id || 'N/A'})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Meta WhatsApp API List Error [${error.response.status}]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network Error in sendListMessage to ${to}: ${error.message}`);
    }
    return null;
  }
};

/**
 * Send PDF brochure or document message using WhatsApp Cloud API
 * @param {string} to Recipient phone number
 * @param {string} documentUrl URL to PDF document
 * @param {string} filename Name of the file
 * @param {string} caption Optional caption text
 * @returns {Promise<object|null>}
 */
const sendDocumentMessage = async (to, documentUrl, filename = 'Sruthi_Technologies_Brochure.pdf', caption = 'Sruthi Technologies Product Brochure 📄') => {
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
      type: 'document',
      document: {
        link: documentUrl,
        filename: filename,
        caption: caption
      }
    };

    const response = await axios.post(url, payload, {
      headers: {
        'Authorization': `Bearer ${whatsappToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✉️ Document brochure sent to ${to} (ID: ${response.data?.messages?.[0]?.id || 'N/A'})`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Meta WhatsApp API Document Error [${error.response.status}]:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(`❌ Network Error in sendDocumentMessage to ${to}: ${error.message}`);
    }
    return null;
  }
};

module.exports = {
  sendMessage,
  sendButtonsMessage,
  sendListMessage,
  sendDocumentMessage
};
