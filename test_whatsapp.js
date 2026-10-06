require('dotenv').config();
const whatsappService = require('./src/services/whatsappService');
const { textMessage } = require('./src/utils/responseFormatter');

async function testWhatsAppMessage() {
  // Replace this with a valid destination WhatsApp number with country code (e.g., '919876543210')
  const toPhoneNumber = 'ENTER_YOUR_MOBILE_NUMBER_HERE';

  if (toPhoneNumber === 'ENTER_YOUR_MOBILE_NUMBER_HERE') {
    console.log('⚠️ Please update the `toPhoneNumber` variable in test_whatsapp.js to your actual mobile number.');
    process.exit(1);
  }

  console.log(`Sending a test message to ${toPhoneNumber}...`);
  
  const payload = textMessage(toPhoneNumber, 'Hello! 👋\nThis is a test message from your Sruthi Technologies Chatbot backend!\nYour WhatsApp API integration is working perfectly! 🚀');
  
  const response = await whatsappService.sendMessage(payload);

  if (response) {
    console.log('✅ Message sent successfully!', response);
  } else {
    console.log('❌ Failed to send message. Please check if your PHONE_NUMBER_ID and WHATSAPP_TOKEN are correct.');
  }
}

testWhatsAppMessage();
