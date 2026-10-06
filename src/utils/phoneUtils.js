/**
 * Normalizes an Indian mobile number.
 * Removes all non-digit characters.
 * If the resulting string is > 10 digits and starts with '91' or '0', 
 * it attempts to extract the 10-digit mobile number.
 */
function normalizeMobile(mobile) {
  if (!mobile) return '';
  
  let cleaned = mobile.toString().replace(/\D/g, '');
  
  if (cleaned.length > 10) {
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = cleaned.substring(1);
    }
  }
  
  return cleaned;
}

module.exports = {
  normalizeMobile
};
