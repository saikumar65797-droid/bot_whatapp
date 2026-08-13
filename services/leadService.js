const Lead = require('../models/Lead');

/**
 * Generate unique Lead ID formatted as LEAD-YYYYMMDD-XXXX
 * @returns {Promise<string>}
 */
const generateLeadId = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `LEAD-${dateStr}-`;

  const lastLead = await Lead.findOne({
    leadId: new RegExp(`^${prefix}`)
  })
    .sort({ createdAt: -1 })
    .select('leadId')
    .lean();

  let nextNum = 1;
  if (lastLead && lastLead.leadId) {
    const parts = lastLead.leadId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

/**
 * Create a new non-existing customer lead in 'leads_collection'
 * @param {object} leadData
 * @returns {Promise<object>}
 */
const createLead = async (leadData) => {
  const leadId = await generateLeadId();
  const docData = {
    ...leadData,
    leadId,
    customerType: 'NON_EXISTING',
    source: 'WhatsApp',
    status: 'NEW',
    brochureRequested: false,
    brochureSent: false
  };

  const newLead = await Lead.create(docData);
  console.log(`✅ Saved Lead in leads_collection: ${leadId} for ${leadData.name}`);
  return newLead;
};

/**
 * Update lead document with brochure request/sent status
 * @param {string} leadId 
 * @param {boolean} requested 
 * @param {boolean} sent 
 */
const updateLeadBrochureStatus = async (leadId, requested, sent) => {
  try {
    await Lead.findOneAndUpdate(
      { leadId },
      { brochureRequested: requested, brochureSent: sent }
    );
    console.log(`✅ Updated brochure status for lead ${leadId}: requested=${requested}, sent=${sent}`);
  } catch (error) {
    console.error(`❌ Error updating brochure status for lead ${leadId}:`, error);
  }
};

module.exports = {
  generateLeadId,
  createLead,
  updateLeadBrochureStatus
};
