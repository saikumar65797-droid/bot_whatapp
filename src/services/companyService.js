const mongoose = require('mongoose');
const env = require('../config/env');
const { normalizeMobile } = require('../utils/phoneUtils');
const { normalizeEmail } = require('../utils/validation');
const logger = require('../utils/logger');

class CompanyService {
  getCollection() {
    return mongoose.connection.collection(env.companyProfileCollection);
  }

  async findByMobile(mobile) {
    try {
      const normalizedMobile = normalizeMobile(mobile);
      if (!normalizedMobile) return null;

      const regexPattern = normalizedMobile.split('').join('\\D*');
      const collection = this.getCollection();
      
      const result = await collection.findOne({
        contactNumber: { $regex: regexPattern, $options: 'i' }
      });
      return result;
    } catch (error) {
      logger.error('Error in findByMobile:', error.message);
      return null;
    }
  }

  async verifyMobileAndEmail(mobile, email) {
    try {
      const normalizedMobile = normalizeMobile(mobile);
      const normalizedEmail = normalizeEmail(email);

      if (!normalizedMobile || !normalizedEmail) return null;

      const regexPattern = normalizedMobile.split('').join('\\D*');
      const collection = this.getCollection();
      
      // Must match SAME document
      const result = await collection.findOne({
        contactNumber: { $regex: regexPattern, $options: 'i' },
        contactEmail: normalizedEmail // strict match as requested (lowercased)
      });
      
      return result;
    } catch (error) {
      logger.error('Error in verifyMobileAndEmail:', error.message);
      return null;
    }
  }

  async findBySerialNumber(serialNumber) {
    try {
      if (!serialNumber) return null;
      
      const normalizedSerialNumber = serialNumber.toString().trim();
      
      const collection = this.getCollection();
      const result = await collection.findOne({
        "machines.serialNumber": { $regex: `^${normalizedSerialNumber}$`, $options: 'i' }
      });
      
      return result;
    } catch (error) {
      logger.error('Error in findBySerialNumber:', error.message);
      return null;
    }
  }

  async getCompanyById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      
      const collection = this.getCollection();
      return await collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
    } catch (error) {
      logger.error('Error in getCompanyById:', error.message);
      return null;
    }
  }
}

module.exports = new CompanyService();
