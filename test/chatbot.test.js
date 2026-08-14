require('dotenv').config();
/**
 * Automated Test Suite for Upgraded WhatsApp Chatbot Logic
 */
const { normalizeMobile, normalizeEmail } = require('../services/companyProfileService');
const { STATES, processIncomingMessage } = require('../services/chatbotService');
const { getUserState, setUserState, clearUserState } = require('../utils/userState');
const connectDB = require('../config/mongo');
const { generateTicketId } = require('../services/ticketService');
const { generateRequestId } = require('../services/machineRequestService');
const { generateLeadId } = require('../services/leadService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

async function runTests() {
  console.log('🧪 Starting Upgraded WhatsApp Chatbot Tests...\n');

  // Test 1: Normalization
  assert(normalizeMobile('+91 94206 67077') === '9420667077', 'Mobile normalization strips +91 and spaces');
  assert(normalizeMobile('77956-48641') === '7795648641', 'Mobile normalization strips hyphens');
  assert(normalizeEmail('  Anup.C2008@Gmail.Com ') === 'anup.c2008@gmail.com', 'Email normalization lowercases & trims');

  // Test 2: State Enum Checks
  assert(STATES.WAITING_CUSTOMER_TYPE === 'WAITING_CUSTOMER_TYPE', 'State WAITING_CUSTOMER_TYPE is defined');
  assert(STATES.WAITING_CAPACITY_REQUIRED === 'WAITING_CAPACITY_REQUIRED', 'State WAITING_CAPACITY_REQUIRED is defined');
  assert(STATES.WAITING_NEW_CUSTOMER_REQUEST_TYPE === 'WAITING_NEW_CUSTOMER_REQUEST_TYPE', 'State WAITING_NEW_CUSTOMER_REQUEST_TYPE is defined');
  assert(STATES.WAITING_BROCHURE_CONFIRMATION === 'WAITING_BROCHURE_CONFIRMATION', 'State WAITING_BROCHURE_CONFIRMATION is defined');

  // Test 3: User State Manager
  const testPhone = '919999988888';
  clearUserState(testPhone);
  assert(getUserState(testPhone) === null, 'getUserState returns null for new sender');

  setUserState(testPhone, { state: STATES.WAITING_CUSTOMER_TYPE });
  assert(getUserState(testPhone).state === STATES.WAITING_CUSTOMER_TYPE, 'setUserState updates state');
  clearUserState(testPhone);

  // Test 3.5: Contact Team & Retry Verification Handlers
  const whatsappService = require('../services/whatsappService');
  let lastSentMessage = null;
  const originalSendMessage = whatsappService.sendMessage;
  whatsappService.sendMessage = async (to, text) => {
    lastSentMessage = text;
    return { mock: true };
  };

  // Contact Team Button Test
  setUserState(testPhone, { state: STATES.WAITING_REGISTERED_MOBILE });
  await processIncomingMessage(testPhone, { buttonId: 'contact_team' });
  assert(getUserState(testPhone) === null, 'Contact team button clears user state');
  assert(
    lastSentMessage && lastSentMessage.includes('No problem. Please contact our support team directly:'),
    'Contact team button sends correct support contact message'
  );

  // Retry Verification Button Test
  setUserState(testPhone, { state: STATES.WAITING_REGISTERED_MOBILE });
  await processIncomingMessage(testPhone, { buttonId: 'retry_verification' });
  assert(getUserState(testPhone).state === STATES.WAITING_REGISTERED_MOBILE, 'Retry verification sets state to WAITING_REGISTERED_MOBILE');
  assert(
    lastSentMessage === 'Please enter your registered mobile number.',
    'Retry verification sends registered mobile prompt'
  );

  // Restore original function
  whatsappService.sendMessage = originalSendMessage;

  // Test 4: Database Connection & ID Generators
  await connectDB();

  const ticketId = await generateTicketId();
  console.log('Sample Ticket ID:', ticketId);
  assert(/^TKT-\d{8}-\d{4}$/.test(ticketId), 'Ticket ID format is TKT-YYYYMMDD-XXXX');

  const reqId = await generateRequestId();
  console.log('Sample Request ID:', reqId);
  assert(/^REQ-\d{8}-\d{4}$/.test(reqId), 'Request ID format is REQ-YYYYMMDD-XXXX');

  const leadId = await generateLeadId();
  console.log('Sample Lead ID:', leadId);
  assert(/^LEAD-\d{8}-\d{4}$/.test(leadId), 'Lead ID format is LEAD-YYYYMMDD-XXXX');

  console.log('\n🎉 All Tests Passed Successfully!');
  process.exit(0);
}

runTests();
