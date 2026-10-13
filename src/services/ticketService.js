const mongoose = require('mongoose');
const logger = require('../utils/logger');
const companyService = require('./companyService');

function generateTicketId() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < 10; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `tkt_${str}`;
}

function getTicketType(callType) {
  if (!callType) return null;
  const lower = callType.toLowerCase().trim();
  if (lower === 'amc') return 'AMC';
  if (lower === 'warranty') return 'WARRANTY';
  if (lower.includes('out of warranty') || lower.includes('chargeable')) return 'CHARGEABLE';
  if (lower.includes('install')) return 'INSTALLATION';
  if (lower === 'courtesy visit' || lower === 'others') return 'REPAIR';
  return callType.toUpperCase();
}

function formatMachineDetails(machine) {
  if (!machine) return null;
  const parts = [];
  const typeAndModel = [machine.machineType, machine.model].filter(Boolean).join(' ');
  if (typeAndModel) parts.push(typeAndModel);
  if (machine.numberOfChutes) parts.push(`${machine.numberOfChutes} chutes`);
  if (machine.stdOrExp) parts.push(machine.stdOrExp);
  if (machine.serialNumber) parts.push(machine.serialNumber);
  
  return parts.length > 0 ? parts.join(' · ') : null;
}

const normalizeVal = (val) => {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return val;
};

class TicketService {
  async getNextTicketNumber() {
    const currentYear = new Date().getFullYear();
    try {
      const reg = new RegExp(`^SVC-${currentYear}-(\\d+)`);

      // Read highest ticketNumber from chatbot_tickets (Read-Only)
      const lastTicket = await mongoose.connection.collection('chatbot_tickets').findOne(
        { ticketNumber: reg },
        { sort: { ticketNumber: -1 } }
      );

      let nextNum = 1;
      if (lastTicket && lastTicket.ticketNumber) {
        const match = lastTicket.ticketNumber.match(reg);
        if (match) nextNum = parseInt(match[1], 10) + 1;
      } else {
        // Fallback: Read counter from _meta without modifying/writing to it
        const metaDoc = await mongoose.connection.collection('_meta').findOne({ _id: 'counters' });
        if (metaDoc && metaDoc.value && typeof metaDoc.value.service === 'number') {
          nextNum = metaDoc.value.service + 1;
        }
      }

      return `SVC-${currentYear}-${String(nextNum).padStart(4, '0')}`;
    } catch (err) {
      return `SVC-${currentYear}-${Date.now().toString().slice(-4)}`;
    }
  }

  async createTicket(ticketData) {
    try {
      // Strictly write ONLY to chatbot_tickets collection
      const collection = mongoose.connection.collection('chatbot_tickets');

      // Resolve company profile if not passed directly (Read-Only)
      let company = ticketData.company;
      if (!company && ticketData.companyProfileId) {
        company = await companyService.getCompanyById(ticketData.companyProfileId);
      }

      // Resolve machine details if not passed directly (Read-Only)
      let machine = ticketData.machine;
      if (!machine && company && ticketData.machineSerialNumber) {
        machine = company.machines?.find(m => m.serialNumber === ticketData.machineSerialNumber);
      }

      const entityName = formatMachineDetails(machine);
      const ticketNumber = await this.getNextTicketNumber();
      const ticketId = generateTicketId();
      const nowIso = new Date().toISOString();
      const nowTimestamp = Date.now();

      const description = normalizeVal(ticketData.description);
      const issue = normalizeVal(ticketData.issue) || description;

      // Exact schema matching the screenshot keys without any extra keys
      const payload = {
        _id: ticketId,
        ticketNumber: ticketNumber,
        type: getTicketType(ticketData.callType),
        callType: normalizeVal(ticketData.callType),
        category: normalizeVal(ticketData.category),
        entityCode: normalizeVal(ticketData.entityCode) || null,
        entityName: normalizeVal(entityName),
        company: normalizeVal(company?.company) || normalizeVal(ticketData.company),
        customerName: normalizeVal(company?.customerName) || normalizeVal(company?.company) || normalizeVal(ticketData.customerName),
        orderNumber: normalizeVal(ticketData.orderNumber) || null,
        country: normalizeVal(company?.country) || normalizeVal(ticketData.country),
        state: normalizeVal(company?.state) || normalizeVal(ticketData.state),
        city: normalizeVal(company?.city) || normalizeVal(company?.area) || normalizeVal(ticketData.city),
        deviceDetails: normalizeVal(entityName),
        description: description,
        issue: issue,
        priority: ticketData.priority ? ticketData.priority.toUpperCase() : null,
        attachments: ticketData.attachments || [],
        resolutionAttachments: ticketData.resolutionAttachments || [],
        status: 'OPEN',
        resolution: normalizeVal(ticketData.resolution) || null,
        assignedTo: normalizeVal(ticketData.assignedTo) || null,
        assignedBy: normalizeVal(ticketData.assignedBy) || null,
        defects: ticketData.defects || [],
        workLogs: ticketData.workLogs || [],
        pending: normalizeVal(ticketData.pending) || null,
        history: [
          {
            action: 'RAISED',
            by: normalizeVal(company?.createdBy) || 'U_NEW007',
            at: nowIso,
            note: description || null,
            files: 0
          }
        ],
        openedAt: nowIso,
        closedAt: null,
        createdAt: nowIso,
        createdBy: normalizeVal(company?.createdBy) || null,
        createdByName: normalizeVal(company?.createdByName) || null,
        __i: nowTimestamp
      };

      const result = await collection.insertOne(payload);
      logger.info(`Ticket created in chatbot_tickets: ${ticketNumber} (${ticketId})`);

      return {
        success: true,
        ticketNumber: payload.ticketNumber,
        id: result.insertedId || ticketId,
        doc: payload
      };
    } catch (error) {
      logger.error('Error creating ticket:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TicketService();
