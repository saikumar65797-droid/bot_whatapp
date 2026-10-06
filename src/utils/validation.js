/**
 * Validates and normalizes email addresses.
 */

function normalizeEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized);
}

module.exports = {
  normalizeEmail,
  isValidEmail
};
