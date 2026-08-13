const Ticket = require('../models/Ticket');

/**
 * Generate unique Ticket ID formatted as TKT-YYYYMMDD-XXXX
 * @returns {Promise<string>}
 */
const generateTicketId = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `TKT-${dateStr}-`;

  const lastTicket = await Ticket.findOne({
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
 * Create a new service ticket in 'tickets' collection
 * @param {object} ticketData
 * @returns {Promise<object>}
 */
const createTicket = async (ticketData) => {
  const ticketId = await generateTicketId();
  const docData = {
    ...ticketData,
    ticketId,
    status: 'OPEN',
    source: 'WhatsApp'
  };

  const newTicket = await Ticket.create(docData);
  console.log(`✅ Saved Ticket in tickets collection: ${ticketId} for ${ticketData.companyName}`);
  return newTicket;
};

module.exports = {
  generateTicketId,
  createTicket
};
