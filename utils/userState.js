/**
 * Persistent User State & Event Deduplication Manager
 *
 * Tracks step-by-step conversation progress for every active WhatsApp sender.
 * State is persisted to MongoDB (chatbot_sessions collection) so it survives
 * server restarts / Render free-tier sleep cycles.
 *
 * Architecture: write-through in-memory cache → MongoDB
 *   - Reads are served from cache (fast, no DB round-trip per message).
 *   - Writes go to both cache and MongoDB (async, non-blocking).
 *   - On cold start the cache is empty; first read for a phone will trigger
 *     a DB hydrate so the conversation continues seamlessly.
 */

const UserSession = require('../models/UserSession');

// ─── In-Memory Cache ──────────────────────────────────────────────────────────
// Key: phone string, Value: state object
const userStates = new Map();

// Set of processed WhatsApp Message IDs for deduplication
const processedMessageIds = new Set();

// Deduplication cache max size limit
const MAX_PROCESSED_IDS = 2000;

// ─── Deduplication Helpers ────────────────────────────────────────────────────

/**
 * Check if a WhatsApp message ID has already been processed
 * @param {string} messageId
 * @returns {boolean}
 */
const isMessageProcessed = (messageId) => {
  if (!messageId) return false;
  return processedMessageIds.has(messageId);
};

/**
 * Mark a WhatsApp message ID as processed
 * @param {string} messageId
 */
const markMessageProcessed = (messageId) => {
  if (!messageId) return;
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    // Clear oldest item to avoid memory leak
    const oldestKey = processedMessageIds.values().next().value;
    processedMessageIds.delete(oldestKey);
  }
  processedMessageIds.add(messageId);
};

// ─── State Helpers ────────────────────────────────────────────────────────────

/**
 * Persist state object to MongoDB (fire-and-forget — never throws).
 * @param {string} phone
 * @param {object} state
 */
const persistToDB = (phone, state) => {
  UserSession.findOneAndUpdate(
    { phone },
    { state, updatedAt: new Date() },
    { upsert: true, new: true }
  ).catch((err) => {
    console.error('⚠️  Failed to persist session to MongoDB:', err.message);
  });
};

/**
 * Get current state for a user's phone number.
 * On cache miss (e.g. after server restart), hydrates from MongoDB.
 *
 * NOTE: This function is async when a cold-start DB lookup is required.
 * The chatbot service must await it.
 *
 * @param {string} phone
 * @returns {Promise<object|null>}
 */
const getUserState = async (phone) => {
  // Fast path: cache hit
  if (userStates.has(phone)) {
    return userStates.get(phone);
  }

  // Cold start: attempt DB hydration
  try {
    const session = await UserSession.findOne({ phone }).lean();
    if (session && session.state) {
      userStates.set(phone, session.state);
      return session.state;
    }
  } catch (err) {
    console.error('⚠️  Failed to hydrate session from MongoDB:', err.message);
  }

  return null;
};

/**
 * Update or set state for a user's phone number.
 * Writes to cache immediately and persists to MongoDB asynchronously.
 *
 * @param {string} phone
 * @param {object} stateData
 */
const setUserState = (phone, stateData) => {
  const currentState = userStates.get(phone) || {};
  const newState = {
    ...currentState,
    ...stateData,
    updatedAt: Date.now()
  };
  userStates.set(phone, newState);
  persistToDB(phone, newState);
};

/**
 * Clear/delete state after successful form submission or reset.
 * @param {string} phone
 */
const clearUserState = (phone) => {
  userStates.delete(phone);
  UserSession.deleteOne({ phone }).catch((err) => {
    console.error('⚠️  Failed to delete session from MongoDB:', err.message);
  });
};

// ─── Periodic In-Memory Cleanup ───────────────────────────────────────────────
// MongoDB TTL index handles DB-side cleanup (24 h). This cleans the cache.
setInterval(() => {
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (const [phone, state] of userStates.entries()) {
    if (state.updatedAt && now - state.updatedAt > TWENTY_FOUR_HOURS) {
      userStates.delete(phone);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  isMessageProcessed,
  markMessageProcessed,
  getUserState,
  setUserState,
  clearUserState
};
