const mongoose = require('mongoose');

/**
 * Lead Schema
 * Stores non-existing customer leads/enquiries in 'leads_collection' collection
 */
const leadSchema = new mongoose.Schema(
  {
    leadId: {
      type: String,
      unique: true,
      sparse: true
    },
    name: {
      type: String,
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    factoryName: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    machineType: {
      type: String,
      required: true
    },
    customerType: {
      type: String,
      default: 'NON_EXISTING'
    },
    source: {
      type: String,
      default: 'WhatsApp'
    },
    status: {
      type: String,
      default: 'NEW'
    },
    brochureRequested: {
      type: Boolean,
      default: false
    },
    brochureSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'leads_collection'
  }
);

const Lead = mongoose.model('Lead', leadSchema, 'leads_collection');

module.exports = Lead;
