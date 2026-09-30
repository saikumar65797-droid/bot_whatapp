const mongoose = require('mongoose');

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

const isPhoneNumber = (value) => {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
};

/**
 * Returns a normalized shape to work across legacy and live company-profile collections.
 */
const normalizeCompanyProfile = (profile) => {
  if (!profile) return null;

  const companyName = profile.companyProfileName || profile.company || profile.companyName || 'N/A';
  const cleanCompany = String(companyName).replace(/^:\s*/, '').trim();
  const storedContactNumber = profile.contactNumber || profile.contact?.numbers?.[0] || profile.mobile || profile.phone || '';
  const storedContactPerson = profile.contactPerson || profile.contact?.person || '';
  const contactNumber = isPhoneNumber(storedContactNumber)
    ? storedContactNumber
    : (isPhoneNumber(storedContactPerson) ? storedContactPerson : storedContactNumber);
  const contactPerson = isPhoneNumber(storedContactPerson)
    ? (storedContactNumber && !isPhoneNumber(storedContactNumber) ? storedContactNumber : '')
    : storedContactPerson;

  const rawMachines = (profile.machines && profile.machines.length > 0)
    ? profile.machines
    : (profile.machinesSold || profile.registeredMachines || profile.equipment || profile.machine || profile.machines || []);

  return {
    ...profile,
    companyProfileName: cleanCompany,
    profileCode: profile.profileCode || profile.profile || '',
    contactPerson,
    contactNumber,
    contactEmail: profile.contactEmail || profile.contact?.email || profile.email || '',
    country: profile.country || profile.address?.country || '',
    state: profile.state || profile.address?.state || profile.region || '',
    area: profile.area || profile.address?.districtArea || profile.address?.district || '',
    machines: Array.isArray(rawMachines) ? rawMachines : (rawMachines ? [rawMachines] : [])
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
  if (!db) {
    throw new Error('MongoDB connection is not ready');
  }

  for (const collectionName of getCompanyProfileCollectionNames()) {
    const collection = db.collection(collectionName);
    const profile = await collection.findOne(finalQuery);
    if (profile) return profile;
  }

  return null;
};

const findProfilesInMongoDb = async (query) => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready');

  const results = [];
  for (const collectionName of getCompanyProfileCollectionNames()) {
    try {
      const docs = await db.collection(collectionName).find(query).toArray();
      results.push(...docs);
    } catch (_) { /* skip invalid collections */ }
  }
  return results;
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
        if (profile) return normalizeCompanyProfile(profile);
      } catch (error) {
        // Continue to other supported profile collections and ID formats.
      }
    }
  }

  return null;
};

/**
 * Compute a similarity score between two email strings (0 = no match, 1 = identical).
 * Domain must match exactly. Local-part is scored by counting characters in common
 * relative to the longer string, which handles insertions/deletions anywhere.
 */
const emailSimilarity = (a, b) => {
  if (!a || !b) return 0;
  const aLow = String(a).toLowerCase().trim();
  const bLow = String(b).toLowerCase().trim();
  if (aLow === bLow) return 1;

  const [aLocal = '', aDomain = ''] = aLow.split('@');
  const [bLocal = '', bDomain = ''] = bLow.split('@');

  // Domain must match exactly for security
  if (aDomain !== bDomain) return 0;

  // Count characters in common (multiset intersection)
  const freq = {};
  for (const ch of aLocal) freq[ch] = (freq[ch] || 0) + 1;
  let common = 0;
  for (const ch of bLocal) {
    if (freq[ch] > 0) { common++; freq[ch]--; }
  }
  const maxLen = Math.max(aLocal.length, bLocal.length);
  return maxLen === 0 ? 0 : common / maxLen;
};


/**
 * Search company profiles using the real live fields and the legacy nested fields.
 *
 * Two-tier strategy:
 *  1. Exact phone + exact email match (fast, strict).
 *  2. Phone-only match → pick the candidate with the highest email similarity
 *     (handles typos / legacy data-entry errors in the stored email).
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

    const phoneOrClauses = [
      { contactNumber: { $regex: new RegExp(clean10, 'i') } },
      { contactNumber: phoneRegex },
      { contactNumber: normMobile },
      { contactPerson: { $regex: new RegExp(clean10, 'i') } },
      { contactPerson: phoneRegex },
      { contactPerson: normMobile },
      { 'contact.numbers': phoneRegex },
      { 'contact.numbers': normMobile },
      { phone: phoneRegex },
      { phone: normMobile },
      { mobile: phoneRegex },
      { mobile: normMobile }
    ];

    // ── Tier 1: Exact phone + exact email ────────────────────────────────────
    const exactQuery = {
      $and: [
        { $or: phoneOrClauses },
        {
          $or: [
            { contactEmail: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { 'contact.email': { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } }
          ]
        }
      ]
    };

    let profile = await findProfileInMongoDb(exactQuery);

    // ── Tier 2: Phone-only → best email similarity ────────────────────────────
    // Handles cases where the email stored in the DB has a typo vs what the
    // customer actually types (e.g. "revanag..." stored vs "revanaa..." typed).
    if (!profile) {
      console.log(`🔍 Exact match missed. Trying fuzzy email fallback for mobile: ${normMobile}`);

      const phoneQuery = { $or: phoneOrClauses };
      const candidates = await findProfilesInMongoDb(phoneQuery);

      if (candidates.length > 0) {
        const SIMILARITY_THRESHOLD = 0.6;
        let bestScore = 0;
        let bestDoc = null;

        for (const doc of candidates) {
          const storedEmail = doc.contactEmail || doc['contact.email'] || doc.email || '';
          const score = emailSimilarity(storedEmail, normEmail);
          const machineCount = Array.isArray(doc.machines) ? doc.machines.length : 0;
          console.log(`  Candidate: "${doc.company || doc.companyProfileName}" | stored="${storedEmail}" | typed="${normEmail}" | score=${score.toFixed(2)} | machines=${machineCount}`);
          // Prefer higher score; on tie prefer more machines
          const isBetter = score > bestScore || (score === bestScore && machineCount > (Array.isArray(bestDoc?.machines) ? bestDoc.machines.length : 0));
          if (isBetter) {
            bestScore = score;
            bestDoc = doc;
          }
        }

        if (bestDoc && bestScore >= SIMILARITY_THRESHOLD) {
          console.log(`✅ Fuzzy email match accepted (score=${bestScore.toFixed(2)}): ${bestDoc.company || bestDoc.companyProfileName}`);
          profile = bestDoc;
        } else {
          console.log(`🔍 Fuzzy match below threshold (best=${bestScore.toFixed(2)}) for mobile: ${normMobile}, email: ${normEmail}`);
        }
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
    throw error;
  }
};

module.exports = {
  normalizeMobile,
  normalizeEmail,
  isPhoneNumber,
  normalizeCompanyProfile,
  findMatchingCompanyProfile,
  findCompanyProfileById
};
