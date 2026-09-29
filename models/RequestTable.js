const mongoose = require('mongoose');

/**
 * RequestTable Schema
 * Stores new machine requests from existing registered customers in 'request_table' collection
 */
const requestTableSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      sparse: true
    },
    customerMobile: {
      type: String,
      required: true
    },
    customerEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    companyProfileId: {
      type: String
    },
    companyName: {
      type: String,
      required: true
    },
    state: {
      type: String
    },
    district: {
      type: String
    },
    machineType: {
      type: String,
      required: true
    },
    machineModel: {
      type: String,
      required: true
    },
    numberOfChutes: {
      type: Number,
      required: true
    },
    capacityRequired: {
      type: String,
      required: true
    },
    grainType: {
      type: String,
      required: true
    },
    requestType: {
      type: String,
      default: 'NEW_MACHINE'
    },
    status: {
      type: String,
      default: 'NEW'
    },
    source: {
      type: String,
      default: 'WhatsApp'
    }
  },
  {
    timestamps: true,
    collection: 'request_table'
  }
);

const RequestTable = mongoose.model('RequestTable', requestTableSchema, 'request_table');

module.exports = RequestTable;
