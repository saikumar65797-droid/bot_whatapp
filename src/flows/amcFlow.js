const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const companyService = require('../services/companyService');
const amcService = require('../services/amcService');
const { textMessage, interactiveButtons, interactiveList } = require('../utils/responseFormatter');
const { isContractActive, formatDate } = require('../utils/dateUtils');
const env = require('../config/env');
const { showSupport, sendMainMenu } = require('./existingCustomerFlow');
const AMC_PLANS = require('../config/amcPlans');

async function handleAmcFlow(session, textMsg, from) {
  const company = await companyService.getCompanyById(session.companyProfileId);
  const machines = company?.machines || [];

  switch (session.state) {
    case 'SELECT_AMC_MACHINE':
      if (machines.length === 0) {
        await whatsappService.sendMessage(textMessage(from, 'No machines are registered under your company profile.\n\nPlease contact our support team.'));
        await showSupport(from);
        await sessionService.clearSession(from);
      } else {
        const selected = machines.find(m => m.id === textMsg || m.serialNumber === textMsg);
        if (selected) {
          // Check existing AMC
          const activeAMC = selected.contract?.type === 'AMC' && isContractActive(selected.contract.startDate, selected.contract.endDate);
          if (activeAMC) {
            const totalV = selected.contract.visits || 0;
            const usedV = selected.contract.usedVisits || 0;
            const leftV = totalV - usedV;
            await whatsappService.sendMessage(textMessage(from, `Selected machine already has an active AMC.\n\nAMC Valid From: ${formatDate(selected.contract.startDate)}\nAMC Valid Until: ${formatDate(selected.contract.endDate)}\nTotal Visits: ${totalV}\nUsed Visits: ${usedV}\nLeft Visits: ${leftV}`));
            await whatsappService.sendMessage(textMessage(from, `Thank you for contacting us.\n\nPhone: ${env.supportPhone}\nEmail: ${env.supportEmail}\nWebsite: ${env.websiteUrl}`));
            await sessionService.clearSession(from);
          } else {
            await sessionService.updateSession(from, { 
              selectedMachineId: selected.id,
              selectedMachineSerialNumber: selected.serialNumber,
              state: 'AMC_PLAN_SELECTION'
            });
            await askAmcDuration(from);
          }
        } else {
          // Show machines
          const rows = machines.slice(0, 10).map(m => ({
            id: m.serialNumber,
            title: String(m.machineType || 'Machine').substring(0, 24),
            description: `Model: ${m.model} | SN: ${m.serialNumber}`.substring(0, 72)
          }));
          const sections = [{ title: 'Select Machine', rows }];
          await whatsappService.sendMessage(interactiveList(from, 'Please select the machine for AMC.', 'Machines', sections));
        }
      }
      break;

    case 'AMC_PLAN_SELECTION':
      const plan = AMC_PLANS.find(p => p.duration === textMsg || p.months.toString() === textMsg);
      if (plan) {
        await sessionService.updateSession(from, { 
          selectedAMCPlan: plan,
          state: 'AMC_CONFIRMATION'
        });
        
        const selMachine = machines.find(mac => mac.serialNumber === session.selectedMachineSerialNumber);
        
        const summary = `AMC Plan\n\nMachine: ${selMachine?.model || ''}\nSerial Number: ${session.selectedMachineSerialNumber}\nDuration: ${plan.duration}\nNumber of Visits: ${plan.visits}\nAmount: ₹${plan.amount}\n\nWould you like to proceed with this AMC request?`;
        
        await whatsappService.sendMessage(interactiveButtons(from, summary, [
          { id: 'yes', title: 'YES' },
          { id: 'no', title: 'NO' }
        ]));
      } else {
        await askAmcDuration(from);
      }
      break;

    case 'AMC_CONFIRMATION':
      if (['yes', 'y', '1'].includes(textMsg.toLowerCase())) {
        const res = await amcService.createAmcRequest({
          companyProfileId: session.companyProfileId,
          whatsappNumber: from,
          machineSerialNumber: session.selectedMachineSerialNumber,
          amcPlan: session.selectedAMCPlan
        });
        
        if (res.success) {
          await whatsappService.sendMessage(textMessage(from, 'Thank you.\nYour AMC request has been submitted successfully.\n\nOur team will contact you shortly.'));
        } else {
          await whatsappService.sendMessage(textMessage(from, 'Sorry, we could not process your AMC request right now.'));
        }
      } else {
        await whatsappService.sendMessage(textMessage(from, 'No problem.\n\nIf you need AMC assistance in the future, please contact us.'));
      }
      await sessionService.clearSession(from);
      break;
  }
}

async function askAmcDuration(from) {
  const rows = AMC_PLANS.map(p => ({
    id: p.duration,
    title: p.duration,
    description: `Visits: ${p.visits}, Amount: ₹${p.amount}`
  }));
  const sections = [{ title: 'AMC Duration', rows }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select AMC duration.', 'Durations', sections));
}

module.exports = {
  handleAmcFlow
};
