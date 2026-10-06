const mongoose = require('mongoose');
const logger = require('../utils/logger');

class TicketService {
  async createTicket(ticketData) {
    try {
      const collection = mongoose.connection.collection('ccms_tickets');
      
      const payload = {
        ...ticketData,
        source: 'WhatsApp_Chatbot',
        status: 'Open',
        ticketNumber: `TKT-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(payload);
      return { success: true, ticketNumber: payload.ticketNumber, id: result.insertedId };
    } catch (error) {
      logger.error('Error creating ticket:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TicketService();
