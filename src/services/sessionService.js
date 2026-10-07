const ChatbotSession = require('../models/chatbotSession');
const logger = require('../utils/logger');

class SessionService {
  async getSession(whatsappNumber) {
    try {
      let session = await ChatbotSession.findOne({ whatsappNumber });
      if (!session) {
        session = await ChatbotSession.create({ whatsappNumber, state: 'START' });
      }
      return session;
    } catch (error) {
      logger.error(`Error getting session for ${logger.maskNumber(whatsappNumber)}: ${error.message}`);
      throw error;
    }
  }

  async updateSession(whatsappNumber, updateData) {
    try {
      return await ChatbotSession.findOneAndUpdate(
        { whatsappNumber },
        { $set: updateData },
        { returnDocument: 'after', upsert: true }
      );
    } catch (error) {
      logger.error(`Error updating session for ${logger.maskNumber(whatsappNumber)}: ${error.message}`);
      throw error;
    }
  }

  async clearSession(whatsappNumber) {
    try {
      await ChatbotSession.findOneAndUpdate(
        { whatsappNumber },
        {
          $set: { state: 'START' },
          $unset: {
            companyProfileId: 1,
            profileCode: 1,
            company: 1,
            verifiedBy: 1,
            selectedMachineId: 1,
            selectedMachineSerialNumber: 1,
            callType: 1,
            category: 1,
            priority: 1,
            description: 1,
            selectedAMCPlan: 1,
            newMachineType: 1,
            newMachineModel: 1,
            numberOfChutes: 1,
            newCustomerName: 1,
            newCustomerMobile: 1,
            newCustomerEmail: 1,
            newCustomerAddress: 1,
            newCustomerBusinessType: 1,
            enquiryType: 1,
            enquiryDescription: 1
          }
        },
        { returnDocument: 'after' }
      );
    } catch (error) {
      logger.error(`Error clearing session for ${logger.maskNumber(whatsappNumber)}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new SessionService();
