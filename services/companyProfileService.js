const mongoose = require('mongoose');
const CompanyProfile = require('../models/CompanyProfile');

/**
 * Normalize mobile number to 10 digits
 * @param {string} mobile 
 * @returns {string} 10 digit mobile string
 */
const normalizeMobile = (mobile) => {
  if (!mobile) return '';
  // Remove spaces, hyphens, plus sign
  let cleaned = mobile.replace(/[\s\-\+]/g, '');
  // If starts with 91 and has 12 digits, strip 91
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  return cleaned;
};

/**
 * Normalize email address
 * @param {string} email 
 * @returns {string} trimmed lowercase email
 */
const normalizeEmail = (email) => {
  if (!email) return '';
  return email.trim().toLowerCase();
};

/**
 * Search the 'company profile' collection using BOTH registered mobile and registered email
 * @param {string} mobile 
 * @param {string} email 
 * @returns {Promise<object|null>} Company profile document or null if not found
 */
const findMatchingCompanyProfile = async (mobile, email) => {
  try {
    const normMobile = normalizeMobile(mobile);
    const normEmail = normalizeEmail(email);

    if (!normMobile || !normEmail) {
      return null;
    }

    const escapedEmail = normEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Create flexible regex allowing optional spaces/hyphens/pluses between digits
    const digitsOnly = normMobile.replace(/\D/g, '');
    const clean10 = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    const phonePattern = clean10.split('').join('[\\s\\-\\+]*');
    const phoneRegex = new RegExp(phonePattern);

    // Query both contact.numbers (or phone/mobile fields) and contact.email
    const query = {
      $or: [
        { 'contact.numbers': phoneRegex },
        { 'contact.numbers': normMobile },
        { phone: phoneRegex },
        { mobile: phoneRegex }
      ],
      $or2: undefined // Keep query clean
    };

    // Filter email flexibly across contact.email or email
    const finalQuery = {
      $and: [
        {
          $or: [
            { 'contact.numbers': phoneRegex },
            { 'contact.numbers': normMobile },
            { phone: phoneRegex },
            { mobile: phoneRegex }
          ]
        },
        {
          $or: [
            { 'contact.email': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
          ]
        }
      ]
    };

    let profile = await CompanyProfile.findOne(finalQuery).lean();

    // Fallback: If not found in active connection DB and DB is not 'chabot', check 'chabot' DB on same cluster
    if (!profile && mongoose.connection.name !== 'chabot') {
      console.log(`ℹ️ Profile not found in [${mongoose.connection.name}]. Trying fallback to [chabot] DB...`);
      const chabotDb = mongoose.connection.useDb('chabot');
      const ChabotCompanyProfile = chabotDb.model('CompanyProfile', CompanyProfile.schema, 'company profile');
      profile = await ChabotCompanyProfile.findOne(finalQuery).lean();
    }

    if (!profile) {
      console.log(`🔍 Company profile search missed for mobile: ${normMobile}, email: ${normEmail}`);
      return null;
    }

    console.log(`✅ Company profile found: ${profile.company} (Code: ${profile.profileCode})`);

    // Clean leading colon or whitespace if present in company name
    const rawCompany = profile.company || '';
    const cleanCompany = rawCompany.replace(/^:\s*/, '').trim();

    return {
      rawDoc: profile,
      companyProfileName: cleanCompany,
      profileCode: profile.profileCode
    };
  } catch (error) {
    console.error('❌ Error in findMatchingCompanyProfile:', error);
    return null;
  }
};

module.exports = {
  normalizeMobile,
  normalizeEmail,
  findMatchingCompanyProfile
};
