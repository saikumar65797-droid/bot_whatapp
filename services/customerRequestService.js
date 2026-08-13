const CustomerRequest = require('../models/CustomerRequest');

/**
 * Generate a unique sequential ticket ID (e.g. TKT-2026-0001)
 * @returns {Promise<string>}
 */
const generateTicketId = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `TKT-${currentYear}-`;

  const lastTicket = await CustomerRequest.findOne({
    ticketId: new RegExp(`^${prefix}`)
  })
    .sort({ createdAt: -1 })
    .select('ticketId')
    .lean();

  let nextNum = 1;
  if (lastTicket && lastTicket.ticketId) {
    const parts = lastTicket.ticketId.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextNum = lastSeq + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
};

/**
 * Create a new Raise Ticket request in 'customerRequests' collection
 * @param {object} params
 * @returns {Promise<object>} Saved document
 */
const createTicketRequest = async ({ mobile, email, companyProfileName, issueDescription, whatsappNumber }) => {
  const ticketId = await generateTicketId();

  const ticketData = {
    ticketId,
    requestType: 'raise_ticket',
    mobile,
    email: email.toLowerCase(),
    companyProfileName,
    issueDescription,
    whatsappNumber,
    status: 'open'
  };

  const newTicket = await CustomerRequest.create(ticketData);
  console.log(`✅ Saved Ticket Request in customerRequests: ${ticketId} for ${companyProfileName}`);
  return newTicket;
};

/**
 * Create a new Add Machine request in 'customerRequests' collection
 * @param {object} params
 * @returns {Promise<object>} Saved document
 */
const createMachineRequest = async ({ mobile, email, companyProfileName, machineType, whatsappNumber }) => {
  const machineData = {
    requestType: 'add_new_machine',
    mobile,
    email: email.toLowerCase(),
    companyProfileName,
    machineType,
    whatsappNumber,
    status: 'new'
  };

  const newMachineReq = await CustomerRequest.create(machineData);
  console.log(`✅ Saved Machine Request in customerRequests for ${companyProfileName}: ${machineType}`);
  return newMachineReq;
};

module.exports = {
  generateTicketId,
  createTicketRequest,
  createMachineRequest
};
