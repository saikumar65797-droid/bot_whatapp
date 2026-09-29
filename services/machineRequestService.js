const RequestTable = require('../models/RequestTable');

/**
 * Generate unique Request ID formatted as REQ-YYYYMMDD-XXXX
 * @returns {Promise<string>}
 */
const generateRequestId = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `REQ-${dateStr}-`;

  const lastReq = await RequestTable.findOne({
    requestId: new RegExp(`^${prefix}`)
  })
    .sort({ createdAt: -1 })
    .select('requestId')
    .lean();

  let nextNum = 1;
  if (lastReq && lastReq.requestId) {
    const parts = lastReq.requestId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

/**
 * Create a new machine request in 'request_table' collection
 * @param {object} reqData
 * @returns {Promise<object>}
 */
const createMachineRequest = async (reqData) => {
  const requestId = await generateRequestId();
  const docData = {
    ...reqData,
    requestId,
    requestType: 'NEW_MACHINE',
    status: 'NEW',
    source: 'WhatsApp'
  };

  const newReq = await RequestTable.create(docData);
  console.log(`✅ Saved Machine Request in request_table collection: ${requestId} for ${reqData.companyName}`);
  return newReq;
};

module.exports = {
  generateRequestId,
  createMachineRequest
};
