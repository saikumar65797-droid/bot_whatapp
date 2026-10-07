const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const machineRequestService = require('../services/machineRequestService');
const { textMessage, interactiveList, documentMessage } = require('../utils/responseFormatter');
const env = require('../config/env');
const { sendMainMenu } = require('./existingCustomerFlow');

const MACHINE_TYPES = ['Sorter', 'Packing Machine', 'Classifier', 'Destoner', 'Air Compressor', 'UPS', 'Grain Dryers', 'Cyclone', 'Airlock', 'Elevator', 'Rubber Rolls', 'Emery Stoner', 'Silos', 'Seeding Machines', 'Others'];
const SORTER_MODELS = ['RGBS', 'Ultima', 'Ultra S', 'Ultra SI', 'FALCON', 'FCS', 'UTR', 'Others'];

async function handleNewMachineFlow(session, textMsg, from) {
  switch (session.state) {
    case 'NEW_MACHINE_TYPE':
      if (MACHINE_TYPES.includes(textMsg) || MACHINE_TYPES.some(t => t.toLowerCase() === textMsg.toLowerCase())) {
        const typeStr = MACHINE_TYPES.find(t => t.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { newMachineType: typeStr });

        if (typeStr === 'Sorter') {
          await sessionService.updateSession(from, { state: 'NEW_MACHINE_MODEL' });
          await askMachineModel(from);
        } else {
          // Finish for non-sorter
          await finishMachineRequest(from, session, typeStr, null, null);
        }
      } else {
        await askMachineType(from);
      }
      break;

    case 'NEW_MACHINE_MODEL':
      if (SORTER_MODELS.includes(textMsg) || SORTER_MODELS.some(m => m.toLowerCase() === textMsg.toLowerCase())) {
        const modelStr = SORTER_MODELS.find(m => m.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { newMachineModel: modelStr, state: 'NEW_MACHINE_CHUTES' });
        await askChutes(from);
      } else {
        await askMachineModel(from);
      }
      break;

    case 'NEW_MACHINE_CHUTES':
      const chutes = parseInt(textMsg, 10);
      if (!isNaN(chutes) && chutes >= 1 && chutes <= 14) {
        await sessionService.updateSession(from, { numberOfChutes: chutes.toString() });
        await finishMachineRequest(from, session, 'Sorter', session.newMachineModel, chutes.toString());
      } else {
        await askChutes(from);
      }
      break;
  }
}

async function askMachineType(from) {
  const rows = MACHINE_TYPES.slice(0, 10).map(t => ({ id: t, title: t }));
  const sections = [{ title: 'Machine Types', rows }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select the machine type.', 'Types', sections));
}

async function askMachineModel(from) {
  const rows = SORTER_MODELS.map(m => ({ id: m, title: m }));
  const sections = [{ title: 'Sorter Models', rows }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select the machine model.', 'Models', sections));
}

async function askChutes(from) {
  await whatsappService.sendMessage(textMessage(from, 'Please enter the number of chutes (1-14).'));
}

async function finishMachineRequest(from, session, type, model, chutes) {
  await machineRequestService.createRequest({
    companyProfileId: session.companyProfileId,
    whatsappNumber: from,
    machineType: type,
    model: model,
    chutes: chutes
  });

  const msg = `Thank you for your requirement.\n\nOur team will contact you regarding the new machine.\n\nPhone: ${env.supportPhone}\nEmail: ${env.supportEmail}\nWebsite: ${env.websiteUrl}`;
  await whatsappService.sendMessage(documentMessage(from, env.brochureUrl, 'Sruthi_Technologies_Brochure.pdf', msg));

  await sessionService.clearSession(from);
}

module.exports = {
  handleNewMachineFlow,
  askMachineType,
  MACHINE_TYPES,
  SORTER_MODELS,
  askMachineModel,
  askChutes
};
