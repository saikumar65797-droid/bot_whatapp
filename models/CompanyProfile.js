const mongoose = require('mongoose');
const companyProfileCollection = process.env.COMPANY_PROFILE_COLLECTION || 'companyProfiles_testing';

/**
 * CompanyProfile Schema
 * Read-Only access to the existing 'company profile' collection
 */
const companyProfileSchema = new mongoose.Schema(
  {
    profile: String,
    profileCode: String,
    company: {
      type: String,
      trim: true
    },
    contactPerson: String,
    contactNumber: String,
    contactEmail: String,
    country: String,
    state: String,
    area: String,
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
    collection: companyProfileCollection
  }
);

const CompanyProfile = mongoose.model('CompanyProfile', companyProfileSchema, companyProfileCollection);

module.exports = CompanyProfile;
