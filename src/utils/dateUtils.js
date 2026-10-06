/**
 * Date utility functions
 */

function getCurrentDate() {
  return new Date();
}

function parseDateString(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
}

function isContractActive(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return false;
  
  const current = getCurrentDate();
  const start = parseDateString(startDateStr);
  const end = parseDateString(endDateStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  return current >= start && current <= end;
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  
  return d.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}

module.exports = {
  getCurrentDate,
  parseDateString,
  isContractActive,
  formatDate
};
