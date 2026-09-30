const mongoose = require('mongoose');

/**
 * UserSession Schema
 * Persists WhatsApp chatbot conversation state across server restarts.
 * Each document = one active WhatsApp sender session.
 */
const userSessionSchema = new mongoose.Schema(
  {
    // WhatsApp sender phone number (primary key)
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    // Full conversation state object (JSON-serialised)
    state: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Last activity timestamp (used for TTL cleanup)
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false,
    collection: 'chatbot_sessions'
  }
);

// Automatically delete sessions older than 24 hours via MongoDB TTL index
userSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const UserSession = mongoose.model('UserSession', userSessionSchema);

module.exports = UserSession;
