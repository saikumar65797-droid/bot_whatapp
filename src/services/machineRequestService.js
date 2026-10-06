const mongoose = require('mongoose');
const logger = require('../utils/logger');

class MachineRequestService {
  async createRequest(requestData) {
    try {
      const collection = mongoose.connection.collection('customerRequests');
      
      const payload = {
        ...requestData,
        requestType: 'New_Machine',
        source: 'WhatsApp_Chatbot',
        status: 'New',
        requestNumber: `REQ-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(payload);
      return { success: true, requestNumber: payload.requestNumber, id: result.insertedId };
    } catch (error) {
      logger.error('Error creating machine request:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new MachineRequestService();
