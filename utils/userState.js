/**
 * In-Memory User State & Event Deduplication Manager
 * 
 * Tracks step-by-step form progress for every active WhatsApp sender.
 * Filters out duplicate Meta WhatsApp Cloud API webhook retry payloads.
 */

// Key: phone number (string), Value: state object
const userStates = new Map();

// Set of processed WhatsApp Message IDs for deduplication
const processedMessageIds = new Set();

// Deduplication cache max size limit
const MAX_PROCESSED_IDS = 2000;

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
    // Clear oldest items to avoid memory leak
    const oldestKey = processedMessageIds.values().next().value;
    processedMessageIds.delete(oldestKey);
  }
  processedMessageIds.add(messageId);
};

/**
 * Get current state for a user's phone number
 * @param {string} phone 
 * @returns {object|null}
 */
const getUserState = (phone) => {
  return userStates.get(phone) || null;
};

/**
 * Update or set state for a user's phone number
 * @param {string} phone 
 * @param {object} stateData 
 */
const setUserState = (phone, stateData) => {
  const currentState = userStates.get(phone) || {};
  userStates.set(phone, {
    ...currentState,
    ...stateData,
    updatedAt: Date.now()
  });
};

/**
 * Clear/delete state after successful form submission or reset
 * @param {string} phone 
 */
const clearUserState = (phone) => {
  userStates.delete(phone);
};

/**
 * Periodic cleanup for inactive states older than 24 hours
 */
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
