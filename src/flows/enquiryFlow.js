const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const enquiryService = require('../services/enquiryService');
const { textMessage, interactiveButtons, interactiveList } = require('../utils/responseFormatter');
const { sendMainMenu } = require('./existingCustomerFlow');

const ENQUIRY_TYPES = ['Product', 'Machine', 'Spare Parts', 'AMC', 'Service', 'Pricing', 'Installation', 'Other'];

async function handleEnquiryFlow(session, textMsg, from) {
  switch (session.state) {
    case 'ENQUIRY_TYPE':
      if (ENQUIRY_TYPES.includes(textMsg) || ENQUIRY_TYPES.some(t => t.toLowerCase() === textMsg.toLowerCase())) {
        const typeStr = ENQUIRY_TYPES.find(t => t.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { enquiryType: typeStr, state: 'ENQUIRY_DESCRIPTION' });
        await whatsappService.sendMessage(textMessage(from, 'Please enter your enquiry.'));
      } else {
        await askEnquiryType(from);
      }
      break;

    case 'ENQUIRY_DESCRIPTION':
      await sessionService.updateSession(from, { enquiryDescription: textMsg, state: 'ENQUIRY_CONFIRMATION' });
      
      const summary = `Enquiry Summary\n\nType: ${session.enquiryType || ''}\nDescription: ${textMsg}\n\nDo you want to submit this enquiry?`;
      await whatsappService.sendMessage(interactiveButtons(from, summary, [
        { id: 'submit', title: 'SUBMIT' },
        { id: 'cancel', title: 'CANCEL' }
      ]));
      break;

    case 'ENQUIRY_CONFIRMATION':
      if (['submit', 'yes', 'y', '1'].includes(textMsg.toLowerCase())) {
        await enquiryService.createEnquiry({
          companyProfileId: session.companyProfileId,
          whatsappNumber: from,
          customerName: session.company || session.newCustomerName, // If we merged sessions somehow, though enquiry is for existing mostly, wait, user requirement says:
          // "Collect customer/company information from the verified session automatically. For a new customer: Use the information collected during the new-customer flow."
          // But our flow splits early. If new customer chooses enquiry instead? Wait, new customer flow does not have an enquiry option. It goes straight to collecting details and making a machine request.
          // The prompt says "For a new customer: Use the information collected during the new-customer flow."
          // But New Customer flow asks Name, Mobile, Email, Address, Business Type, Machine Type... then it finishes. 
          // Let's just log what we have.
          enquiryType: session.enquiryType,
          description: session.enquiryDescription
        });
        
        await whatsappService.sendMessage(textMessage(from, 'Thank you. Your enquiry has been submitted successfully.\n\nOur team will contact you shortly.'));
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Enquiry cancelled.'));
      }
      
      // If it's a verified company, show main menu. Else clear session.
      if (session.companyProfileId) {
        await sessionService.updateSession(from, { state: 'MAIN_MENU' });
        await sendMainMenu(from);
      } else {
        await sessionService.clearSession(from);
      }
      break;
  }
}

async function askEnquiryType(from) {
  const rows = ENQUIRY_TYPES.map(t => ({ id: t, title: t }));
  const sections = [{ title: 'Enquiry Types', rows }];
  await whatsappService.sendMessage(interactiveList(from, 'What would you like to enquire about?', 'Enquiry Types', sections));
}

module.exports = {
  handleEnquiryFlow,
  askEnquiryType
};
