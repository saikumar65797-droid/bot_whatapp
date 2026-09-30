const mongoose = require('mongoose');
const CompanyProfile = require('../models/CompanyProfile');

/**
 * Normalize mobile number to 10 digits
 * @param {string} mobile
 * @returns {string} 10 digit mobile string
 */
const normalizeMobile = (mobile) => {
  if (!mobile) return '';
  let cleaned = String(mobile).replace(/[\s\-\+]/g, '');
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
  return String(email).trim().toLowerCase();
};

/**
 * Returns a normalized shape to work across legacy and live company-profile collections.
 */
const normalizeCompanyProfile = (profile) => {
  if (!profile) return null;

  const companyName = profile.companyProfileName || profile.company || profile.companyName || 'N/A';
  const cleanCompany = String(companyName).replace(/^:\s*/, '').trim();

  return {
    ...profile,
    companyProfileName: cleanCompany,
    profileCode: profile.profileCode || profile.profile || '',
    contactPerson: profile.contactPerson || profile.contact?.person || '',
    contactNumber: profile.contactNumber || profile.contact?.numbers?.[0] || profile.mobile || profile.phone || '',
    contactEmail: profile.contactEmail || profile.contact?.email || profile.email || '',
    country: profile.country || profile.address?.country || '',
    state: profile.state || profile.address?.state || profile.region || '',
    area: profile.area || profile.address?.districtArea || profile.address?.district || '',
    machines: Array.isArray(profile.machines) ? profile.machines : (profile.machines ? [profile.machines] : [])
  };
};

const getCompanyProfileCollectionNames = () => {
  const configured = process.env.COMPANY_PROFILE_COLLECTION;
  return Array.from(new Set([
    configured,
    'companyProfiles_testing',
    'companyProfiles',
    'company profile',
    'companyProfile',
    'companyprofiles_testing',
    'company profile testing'
  ].filter(Boolean)));
};

const findProfileInMongoDb = async (finalQuery) => {
  const db = mongoose.connection.db;
  if (!db) return null;

  for (const collectionName of getCompanyProfileCollectionNames()) {
    try {
      const collection = db.collection(collectionName);
      const profile = await collection.findOne(finalQuery);
      if (profile) return profile;
    } catch (error) {
      // Ignore collection-not-found errors and continue to the next candidate collection.
    }
  }

  return null;
};

const findCompanyProfileById = async (id) => {
  if (id === undefined || id === null) return null;

  const db = mongoose.connection.db;
  if (!db) return null;

  const ids = [id];
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    ids.push(new mongoose.Types.ObjectId(id));
  }

  for (const collectionName of getCompanyProfileCollectionNames()) {
    for (const profileId of ids) {
      try {
        const profile = await db.collection(collectionName).findOne({ _id: profileId });
        if (profile) return profile;
      } catch (error) {
        // Continue to other supported profile collections and ID formats.
      }
    }
  }

  return null;
};

/**
 * Search company profiles using the real live fields and the legacy nested fields.
 */
const findMatchingCompanyProfile = async (mobile, email) => {
  try {
    const normMobile = normalizeMobile(mobile);
    const normEmail = normalizeEmail(email);

    if (!normMobile || !normEmail) {
      return null;
    }

    const escapedEmail = normEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const digitsOnly = normMobile.replace(/\D/g, '');
    const clean10 = digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
    const phonePattern = clean10.split('').join('[\\s\\-\\+]*');
    const phoneRegex = new RegExp(phonePattern);

    const finalQuery = {
      $and: [
        {
          $or: [
            { contactNumber: { $regex: new RegExp(`^${clean10}$`, 'i') } },
            { contactNumber: { $regex: new RegExp(`^${phonePattern}$`, 'i') } },
            { contactNumber: normMobile },
            { 'contact.numbers': phoneRegex },
            { 'contact.numbers': normMobile },
            { phone: phoneRegex },
            { phone: normMobile },
            { mobile: phoneRegex },
            { mobile: normMobile }
          ]
        },
        {
          $or: [
            { contactEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { 'contact.email': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
          ]
        }
      ]
    };

    let profile = await findProfileInMongoDb(finalQuery);

    if (!profile) {
      try {
        profile = await CompanyProfile.findOne(finalQuery).lean();
      } catch (error) {
        profile = null;
      }
    }

    if (!profile) {
      console.log(`🔍 Company profile search missed for mobile: ${normMobile}, email: ${normEmail}`);
      return null;
    }

    const normalizedProfile = normalizeCompanyProfile(profile);
    console.log(`✅ Company profile found: ${normalizedProfile.companyProfileName} (Code: ${normalizedProfile.profileCode || 'N/A'})`);

    return {
      rawDoc: normalizedProfile,
      companyProfileName: normalizedProfile.companyProfileName,
      profileCode: normalizedProfile.profileCode,
      machines: normalizedProfile.machines || []
    };
  } catch (error) {
    console.error('❌ Error in findMatchingCompanyProfile:', error);
    return null;
  }
};

module.exports = {
  normalizeMobile,
  normalizeEmail,
  normalizeCompanyProfile,
  findMatchingCompanyProfile,
  findCompanyProfileById
};
