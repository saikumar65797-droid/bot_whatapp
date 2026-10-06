const mongoose = require('mongoose');
const logger = require('../utils/logger');

class AmcService {
  async createAmcRequest(amcData) {
    try {
      const collection = mongoose.connection.collection('customerRequests');
      
      const payload = {
        ...amcData,
        requestType: 'AMC',
        source: 'WhatsApp_Chatbot',
        status: 'Pending',
        requestNumber: `AMC-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(payload);
      return { success: true, requestNumber: payload.requestNumber, id: result.insertedId };
    } catch (error) {
      logger.error('Error creating AMC request:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new AmcService();
