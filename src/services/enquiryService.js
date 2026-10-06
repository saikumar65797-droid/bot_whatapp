const mongoose = require('mongoose');
const logger = require('../utils/logger');

class EnquiryService {
  async createEnquiry(enquiryData) {
    try {
      const collection = mongoose.connection.collection('customerRequests');
      
      const payload = {
        ...enquiryData,
        requestType: 'Enquiry',
        source: 'WhatsApp_Chatbot',
        status: 'New',
        enquiryNumber: `ENQ-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(payload);
      return { success: true, enquiryNumber: payload.enquiryNumber, id: result.insertedId };
    } catch (error) {
      logger.error('Error creating enquiry:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EnquiryService();
