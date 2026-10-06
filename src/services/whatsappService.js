const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.apiUrl = `https://graph.facebook.com/v17.0/${env.phoneNumberId}/messages`;
    this.headers = {
      'Authorization': `Bearer ${env.whatsappToken}`,
      'Content-Type': 'application/json'
    };
  }

  async sendMessage(data) {
    try {
      const response = await axios.post(this.apiUrl, data, { headers: this.headers });
      return response.data;
    } catch (error) {
      logger.error('WhatsApp API Error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      // We don't throw to prevent crashing the flow, but we return null
      return null;
    }
  }

  async markAsRead(messageId) {
    try {
      await axios.post(this.apiUrl, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }, { headers: this.headers });
    } catch (error) {
      logger.error('WhatsApp Mark Read Error:', error.message);
    }
  }
}

module.exports = new WhatsAppService();
