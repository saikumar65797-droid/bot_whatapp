const mongoose = require('mongoose');

/**
 * Ticket Schema
 * Stores service tickets raised by existing registered customers in 'tickets' collection
 */
const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
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
    selectedMachineId: {
      type: String
    },
    machineType: {
      type: String
    },
    machineModel: {
      type: String
    },
    callType: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      default: 'OPEN'
    },
    source: {
      type: String,
      default: 'WhatsApp'
    }
  },
  {
    timestamps: true,
    collection: 'tickets'
  }
);

const Ticket = mongoose.model('Ticket', ticketSchema, 'tickets');

module.exports = Ticket;
