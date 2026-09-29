const mongoose = require('mongoose');

/**
 * CustomerRequest Schema
 * Stores chatbot generated tickets and machine requirements in 'customerRequests' collection
 */
const customerRequestSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      sparse: true
    },
    requestType: {
      type: String,
      enum: ['raise_ticket', 'add_new_machine'],
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
    companyProfileName: {
      type: String,
      required: true
    },
    issueDescription: {
      type: String
    },
    machineType: {
      type: String
    },
    whatsappNumber: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: 'new'
    }
  },
  {
    timestamps: true,
    collection: 'customerRequests'
  }
);

const CustomerRequest = mongoose.model('CustomerRequest', customerRequestSchema, 'customerRequests');

module.exports = CustomerRequest;
