const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const machineRequestService = require('../services/machineRequestService');
const { textMessage, interactiveList } = require('../utils/responseFormatter');
const env = require('../config/env');
const { MACHINE_TYPES, SORTER_MODELS, askMachineType, askMachineModel, askChutes } = require('./newMachineFlow');

const BUSINESS_TYPES = ['Rice', 'Dal', 'Jawari', 'Moong', 'Channa', 'Wheat', 'Spices', 'Plastic', 'Multi Grain', 'Others'];

async function handleNewCustomerFlow(session, textMsg, from) {
  switch (session.state) {
    case 'NEW_CUSTOMER_NAME':
      await sessionService.updateSession(from, { newCustomerName: textMsg, state: 'NEW_CUSTOMER_MOBILE' });
      await whatsappService.sendMessage(textMessage(from, 'Please enter your mobile number.'));
      break;

    case 'NEW_CUSTOMER_MOBILE':
      // Very basic validation, we should let them enter free text and validate roughly.
      if (textMsg.length >= 7) {
        await sessionService.updateSession(from, { newCustomerMobile: textMsg, state: 'NEW_CUSTOMER_EMAIL' });
        await whatsappService.sendMessage(textMessage(from, 'Please enter your email address.'));
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Please enter a valid mobile number.'));
      }
      break;

    case 'NEW_CUSTOMER_EMAIL':
      if (textMsg.includes('@')) {
        await sessionService.updateSession(from, { newCustomerEmail: textMsg, state: 'NEW_CUSTOMER_ADDRESS' });
        await whatsappService.sendMessage(textMessage(from, 'Please enter your address.'));
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Please enter a valid email address.'));
      }
      break;

    case 'NEW_CUSTOMER_ADDRESS':
      await sessionService.updateSession(from, { newCustomerAddress: textMsg, state: 'NEW_CUSTOMER_BUSINESS_TYPE' });
      await askBusinessType(from);
      break;

    case 'NEW_CUSTOMER_BUSINESS_TYPE':
      if (BUSINESS_TYPES.includes(textMsg) || BUSINESS_TYPES.some(t => t.toLowerCase() === textMsg.toLowerCase())) {
        const typeStr = BUSINESS_TYPES.find(t => t.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { newCustomerBusinessType: typeStr, state: 'NEW_CUSTOMER_MACHINE_TYPE' });
        await askMachineType(from);
      } else {
        await askBusinessType(from);
      }
      break;

    case 'NEW_CUSTOMER_MACHINE_TYPE':
      if (MACHINE_TYPES.includes(textMsg) || MACHINE_TYPES.some(t => t.toLowerCase() === textMsg.toLowerCase())) {
        const typeStr = MACHINE_TYPES.find(t => t.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { newMachineType: typeStr });

        if (typeStr === 'Sorter') {
          await sessionService.updateSession(from, { state: 'NEW_CUSTOMER_MACHINE_MODEL' });
          await askMachineModel(from);
        } else {
          await finishNewCustomerRequest(from, session, typeStr, null, null);
        }
      } else {
        await askMachineType(from);
      }
      break;

    case 'NEW_CUSTOMER_MACHINE_MODEL':
      if (SORTER_MODELS.includes(textMsg) || SORTER_MODELS.some(m => m.toLowerCase() === textMsg.toLowerCase())) {
        const modelStr = SORTER_MODELS.find(m => m.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { newMachineModel: modelStr, state: 'NEW_CUSTOMER_CHUTES' });
        await askChutes(from);
      } else {
        await askMachineModel(from);
      }
      break;

    case 'NEW_CUSTOMER_CHUTES':
      const chutes = parseInt(textMsg, 10);
      if (!isNaN(chutes) && chutes >= 1 && chutes <= 14) {
        await sessionService.updateSession(from, { numberOfChutes: chutes.toString() });
        await finishNewCustomerRequest(from, session, 'Sorter', session.newMachineModel, chutes.toString());
      } else {
        await askChutes(from);
      }
      break;
  }
}

async function askBusinessType(from) {
  const rows = BUSINESS_TYPES.map(t => ({ id: t, title: t }));
  const sections = [{ title: 'Business Types', rows }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select your business type.', 'Business Types', sections));
}

async function finishNewCustomerRequest(from, session, type, model, chutes) {
  await machineRequestService.createRequest({
    isNewCustomer: true,
    whatsappNumber: from,
    customerName: session.newCustomerName,
    mobile: session.newCustomerMobile,
    email: session.newCustomerEmail,
    address: session.newCustomerAddress,
    businessType: session.newCustomerBusinessType,
    machineType: type,
    model: model,
    chutes: chutes
  });

  const msg = `Thank you for contacting Sruthi Technologies.\n\nOur team will contact you shortly regarding your requirement.\n\nPhone: ${env.supportPhone}\nEmail: ${env.supportEmail}\nWebsite: ${env.websiteUrl}\nBrochure: ${env.brochureUrl}`;
  await whatsappService.sendMessage(textMessage(from, msg));

  await sessionService.clearSession(from);
}

module.exports = {
  handleNewCustomerFlow
};
