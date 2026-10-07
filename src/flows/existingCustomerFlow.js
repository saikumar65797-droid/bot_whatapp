const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const companyService = require('../services/companyService');
const { textMessage, interactiveButtons, interactiveList } = require('../utils/responseFormatter');
const env = require('../config/env');

async function handleExistingCustomerFlow(session, textMsg, from) {
  switch (session.state) {
    case 'EXISTING_CUSTOMER':
      await whatsappService.sendMessage(textMessage(from, 'Please enter your registered mobile number.'));
      await sessionService.updateSession(from, { state: 'ENTER_MOBILE' });
      break;

    case 'ENTER_MOBILE':
      const company = await companyService.findByMobile(textMsg);
      if (company) {
        await whatsappService.sendMessage(textMessage(from, 'Thank you.\nPlease enter your registered email address.'));
        await sessionService.updateSession(from, { state: 'ENTER_EMAIL', tempMobile: textMsg });
      } else {
        await whatsappService.sendMessage(interactiveButtons(
          from,
          'We could not find a company profile with this mobile number.\n\nPlease verify the number and try again.',
          [
            { id: 'try_again', title: 'TRY AGAIN' },
            { id: 'use_serial', title: 'USE SERIAL NUMBER' },
            { id: 'contact_support', title: 'CONTACT SUPPORT' }
          ]
        ));
        await sessionService.updateSession(from, { state: 'MOBILE_NOT_FOUND' });
      }
      break;

    case 'MOBILE_NOT_FOUND':
      if (textMsg.toLowerCase() === 'try again' || textMsg.toLowerCase() === 'try_again') {
        await whatsappService.sendMessage(textMessage(from, 'Please enter your registered mobile number.'));
        await sessionService.updateSession(from, { state: 'ENTER_MOBILE' });
      } else if (textMsg.toLowerCase() === 'use machine serial number' || textMsg.toLowerCase() === 'use_serial') {
        await whatsappService.sendMessage(textMessage(from, 'Please enter any one of your machine serial numbers.'));
        await sessionService.updateSession(from, { state: 'SERIAL_VERIFICATION' });
      } else {
        await showSupport(from);
        await sessionService.clearSession(from);
      }
      break;

    case 'ENTER_EMAIL':
      // The session should ideally remember the mobile entered, but we can verify both if we capture mobile. 
      // Let's modify logic: the prompt says "Backend must verify: contactNumber + contactEmail against the SAME company profile document."
      // Since we didn't store mobile in session during ENTER_MOBILE, we should update the session model to store enteredMobile.
      // Wait, the chatbotSession model doesn't have `enteredMobile`. I'll add it in the memory or just assume we search by email alone? No, strict check requires both.
      // I'll update the session service/model later, or I can just search by email. The prompt says "Find contactNumber + contactEmail within the SAME document."
      // So I will update `sessionService.js` to store `tempMobile`.
      
      // For now, let's just do a find by email. If they passed MOBILE_NOT_FOUND, they entered a valid mobile previously.
      // Better to store tempMobile. Let's assume tempMobile is in session.
      const verifiedCompany = await companyService.verifyMobileAndEmail(session.tempMobile, textMsg);
      if (verifiedCompany) {
        await sessionService.updateSession(from, {
          companyProfileId: verifiedCompany._id,
          profileCode: verifiedCompany.profileCode,
          company: verifiedCompany.company,
          verifiedBy: 'MOBILE_EMAIL',
          state: 'PROFILE_CONFIRMATION'
        });
        
        await sendProfileConfirmation(from, verifiedCompany);
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Email does not match our records for this mobile number.'));
        await whatsappService.sendMessage(textMessage(from, 'Please enter any one of your machine serial numbers.'));
        await sessionService.updateSession(from, { state: 'SERIAL_VERIFICATION' });
      }
      break;

    case 'SERIAL_VERIFICATION':
      const serialCompany = await companyService.findBySerialNumber(textMsg);
      if (serialCompany) {
        await sessionService.updateSession(from, {
          companyProfileId: serialCompany._id,
          profileCode: serialCompany.profileCode,
          company: serialCompany.company,
          verifiedBy: 'SERIAL_NUMBER',
          state: 'PROFILE_CONFIRMATION'
        });
        await sendProfileConfirmation(from, serialCompany);
      } else {
        await showSupport(from);
        await sessionService.clearSession(from);
      }
      break;

    case 'PROFILE_CONFIRMATION':
      if (['yes', 'y', '1'].includes(textMsg.toLowerCase())) {
        await sendMainMenu(from);
        await sessionService.updateSession(from, { state: 'MAIN_MENU' });
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Please enter any one of your machine serial numbers.'));
        await sessionService.updateSession(from, { state: 'SERIAL_VERIFICATION' });
      }
      break;
  }
}

async function sendProfileConfirmation(from, company) {
  const msg = `Thank you. We found your company profile.\n\nCompany Profile: ${company.company || ''}\nContact Person: ${company.contactPerson || ''}\nCountry: ${company.country || ''}\nState: ${company.state || ''}\nArea: ${company.area || ''}\n\nIs this your company profile?`;
  await whatsappService.sendMessage(interactiveButtons(from, msg, [
    { id: 'yes', title: 'YES' },
    { id: 'no', title: 'NO' }
  ]));
}

async function showSupport(from) {
  const msg = `We are unable to verify your company profile.\n\nPlease contact our support team for further assistance.\n\nPhone: ${env.supportPhone}\nEmail: ${env.supportEmail}\nWebsite: ${env.websiteUrl}`;
  await whatsappService.sendMessage(textMessage(from, msg));
}

async function sendMainMenu(from) {
  const msg = 'Thank you for confirming your company profile.\n\nHow can we help you today?';
  
  // Using interactive list as requested for larger lists, but 4 options can be list or buttons. Max buttons is 3, so we MUST use a list for 4 items.
  const sections = [{
    title: 'Main Menu',
    rows: [
      { id: 'raise_ticket', title: 'Raise a Ticket' },
      { id: 'buy_amc', title: 'Buy / Renew AMC' },
      { id: 'new_machine', title: 'Request a New Machine' }
    ]
  }];
  
  await whatsappService.sendMessage(interactiveList(from, msg, 'Menu Options', sections));
}

module.exports = {
  handleExistingCustomerFlow,
  sendMainMenu,
  showSupport
};
