require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/database');
const ticketService = require('../src/services/ticketService');
const companyService = require('../src/services/companyService');

async function runTest() {
  console.log('Connecting to MongoDB...');
  await connectDB();

  console.log('\n--- 1. Testing Ticket Creation with Full Company & Machine Details ---');
  const company = await companyService.getCompanyById('cpf_4z6jwe4r71');
  const machine = company?.machines?.find(m => m.serialNumber === 'slno234123');

  const ticketData1 = {
    companyProfileId: 'cpf_4z6jwe4r71',
    whatsappNumber: '919618497846',
    machineSerialNumber: 'slno234123',
    machineModel: machine?.model,
    callType: 'AMC',
    category: 'Spare Part',
    priority: 'High',
    description: 'Testing chatbot ticket creation with full schema',
    company,
    machine
  };

  const res1 = await ticketService.createTicket(ticketData1);
  console.log('Ticket creation result:', res1.success ? 'SUCCESS' : 'FAILED');
  console.log('Ticket Number:', res1.ticketNumber);
  console.log('Ticket ID:', res1.id);

  if (!res1.success) {
    console.error('Failed to create ticket:', res1.error);
    process.exit(1);
  }

  // Fetch the inserted document directly from ccms_tickets
  const insertedDoc1 = await mongoose.connection.collection('ccms_tickets').findOne({ _id: res1.id });
  console.log('\nFetched document from ccms_tickets:');
  console.log(JSON.stringify(insertedDoc1, null, 2));

  // Assertions for full ticket
  console.log('\nValidating fields:');
  console.assert(insertedDoc1._id.startsWith('tkt_'), 'ID starts with tkt_');
  console.assert(/^SVC-\d{4}-\d{4}$/.test(insertedDoc1.ticketNumber), 'ticketNumber format is SVC-YYYY-NNNN');
  console.assert(insertedDoc1.type === 'AMC', 'type is AMC');
  console.assert(insertedDoc1.callType === 'AMC', 'callType is AMC');
  console.assert(insertedDoc1.category === 'Spare Part', 'category is Spare Part');
  console.assert(insertedDoc1.entityCode === null, 'entityCode is null');
  console.assert(insertedDoc1.entityName === 'Sorter RGBS · 6 chutes · Exp · slno234123', 'entityName matches format');
  console.assert(insertedDoc1.company === 'testg_grain_mills', 'company matches');
  console.assert(insertedDoc1.customerName === 'testg_grain_mills', 'customerName matches');
  console.assert(insertedDoc1.orderNumber === null, 'orderNumber is null');
  console.assert(insertedDoc1.country === 'India', 'country matches');
  console.assert(insertedDoc1.state === 'Andhra Pradesh', 'state matches');
  console.assert(insertedDoc1.city === 'Guntur', 'city matches');
  console.assert(insertedDoc1.deviceDetails === 'Sorter RGBS · 6 chutes · Exp · slno234123', 'deviceDetails matches');
  console.assert(insertedDoc1.priority === 'HIGH', 'priority is HIGH');
  console.assert(Array.isArray(insertedDoc1.attachments) && insertedDoc1.attachments.length === 0, 'attachments is empty array');
  console.assert(Array.isArray(insertedDoc1.resolutionAttachments) && insertedDoc1.resolutionAttachments.length === 0, 'resolutionAttachments is empty array');
  console.assert(insertedDoc1.status === 'OPEN', 'status is OPEN');
  console.assert(insertedDoc1.resolution === null, 'resolution is null');
  console.assert(insertedDoc1.assignedTo === null, 'assignedTo is null');
  console.assert(insertedDoc1.assignedBy === null, 'assignedBy is null');
  console.assert(Array.isArray(insertedDoc1.defects) && insertedDoc1.defects.length === 0, 'defects is empty array');
  console.assert(Array.isArray(insertedDoc1.workLogs) && insertedDoc1.workLogs.length === 0, 'workLogs is empty array');
  console.assert(insertedDoc1.pending === null, 'pending is null');
  console.assert(insertedDoc1.closedAt === null, 'closedAt is null');
  console.assert(typeof insertedDoc1.openedAt === 'string', 'openedAt is ISO string');
  console.assert(typeof insertedDoc1.createdAt === 'string', 'createdAt is ISO string');
  console.assert(insertedDoc1.whatsappNumber === undefined, 'No extra key whatsappNumber');
  console.assert(insertedDoc1.source === undefined, 'No extra key source');
  console.log('✅ Full details ticket validation passed!');

  console.log('\n--- 2. Testing Ticket Creation with Missing Fields (Placing null) ---');
  const minimalTicketData = {
    callType: 'Warranty'
    // All other fields omitted to test null placement
  };

  const res2 = await ticketService.createTicket(minimalTicketData);
  console.log('Minimal Ticket creation result:', res2.success ? 'SUCCESS' : 'FAILED');
  console.log('Minimal Ticket Number:', res2.ticketNumber);

  const insertedDoc2 = await mongoose.connection.collection('ccms_tickets').findOne({ _id: res2.id });
  console.log('\nFetched minimal document from ccms_tickets:');
  console.log(JSON.stringify(insertedDoc2, null, 2));

  console.log('\nValidating null fields on minimal ticket:');
  console.assert(insertedDoc2.type === 'WARRANTY', 'type is WARRANTY');
  console.assert(insertedDoc2.callType === 'Warranty', 'callType is Warranty');
  console.assert(insertedDoc2.category === null, 'category is null');
  console.assert(insertedDoc2.entityCode === null, 'entityCode is null');
  console.assert(insertedDoc2.entityName === null, 'entityName is null');
  console.assert(insertedDoc2.company === null, 'company is null');
  console.assert(insertedDoc2.customerName === null, 'customerName is null');
  console.assert(insertedDoc2.orderNumber === null, 'orderNumber is null');
  console.assert(insertedDoc2.country === null, 'country is null');
  console.assert(insertedDoc2.state === null, 'state is null');
  console.assert(insertedDoc2.city === null, 'city is null');
  console.assert(insertedDoc2.deviceDetails === null, 'deviceDetails is null');
  console.assert(insertedDoc2.description === null, 'description is null');
  console.assert(insertedDoc2.issue === null, 'issue is null');
  console.assert(insertedDoc2.priority === null, 'priority is null');
  console.assert(insertedDoc2.resolution === null, 'resolution is null');
  console.assert(insertedDoc2.assignedTo === null, 'assignedTo is null');
  console.assert(insertedDoc2.assignedBy === null, 'assignedBy is null');
  console.assert(insertedDoc2.pending === null, 'pending is null');
  console.assert(insertedDoc2.closedAt === null, 'closedAt is null');
  console.assert(insertedDoc2.createdBy === null, 'createdBy is null');
  console.assert(insertedDoc2.createdByName === null, 'createdByName is null');
  console.assert(insertedDoc2.status === 'OPEN', 'status is OPEN');
  console.log('✅ Minimal ticket null-placement validation passed!');

  // Clean up test documents
  await mongoose.connection.collection('ccms_tickets').deleteMany({
    _id: { $in: [res1.id, res2.id] }
  });
  console.log('\nCleaned up test tickets from ccms_tickets.');

  console.log('\nALL TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
