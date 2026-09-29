const mongoose = require('mongoose');

/**
 * CompanyProfile Schema
 * Read-Only access to the existing 'company profile' collection
 */
const companyProfileSchema = new mongoose.Schema(
  {
    profileCode: String,
    company: {
      type: String,
      trim: true
    },
    address: {
      country: String,
      state: String,
      districtArea: String
    },
    contact: {
      person: String,
      numbers: [String],
      email: {
        type: String,
        trim: true,
        lowercase: true
      }
    },
    status: String,
    machines: mongoose.Schema.Types.Mixed,
    emailVerified: Boolean,
    verifiedAt: Date,
    createdBy: String,
    sourceSystem: {
      companyId: String
    }
  },
  {
    timestamps: false,
    collection: 'company profile'
  }
);

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema, 'company profile');

module.exports = CompanyProfile;
