const sessionService = require('../services/sessionService');
const whatsappService = require('../services/whatsappService');
const companyService = require('../services/companyService');
const ticketService = require('../services/ticketService');
const { textMessage, interactiveButtons, interactiveList } = require('../utils/responseFormatter');
const { isContractActive, formatDate } = require('../utils/dateUtils');
const { showSupport, sendMainMenu } = require('./existingCustomerFlow');
const env = require('../config/env');

async function handleTicketFlow(session, textMsg, from) {
  const company = await companyService.getCompanyById(session.companyProfileId);
  const machines = company?.machines || [];

  switch (session.state) {
    case 'SELECT_TICKET_MACHINE':
      if (machines.length === 0) {
        await whatsappService.sendMessage(textMessage(from, 'No machines are registered under your company profile.'));
        await showSupport(from);
        await sessionService.updateSession(from, { state: 'MAIN_MENU' });
        await sendMainMenu(from);

      } else {
        // Find if user selected a machine from list (list replies pass ID as textMsg if we map it, but let's assume textMsg is ID from list row)
        // If they haven't selected yet, we show the list.
        // The webhook router should pass list/button ID as textMsg.
        const selected = machines.find(m => m.id === textMsg || m.serialNumber === textMsg);
        if (selected) {
          await sessionService.updateSession(from, { 
            selectedMachineId: selected.id,
            selectedMachineSerialNumber: selected.serialNumber,
            state: 'SELECT_CALL_TYPE'
          });
          await askCallType(from);
        } else {
          // Show machines
          const rows = machines.slice(0, 10).map(m => ({
            id: m.serialNumber, // Use serial as ID for safety
            title: String(m.machineType || 'Machine').substring(0, 24),
            description: `Model: ${m.model} | SN: ${m.serialNumber}`.substring(0, 72)
          }));
          const sections = [{ title: 'Select Machine', rows }];
          await whatsappService.sendMessage(interactiveList(from, 'Please select a machine to raise a ticket.', 'Machines', sections));
        }
      }
      break;

    case 'SELECT_CALL_TYPE':
      const validCallTypes = ['Pre-Install', 'Installation & Commissioning', 'Warranty', 'AMC', 'Out of Warranty', 'Courtesy Visit', 'Others'];
      
      if (validCallTypes.includes(textMsg) || validCallTypes.some(t => t.toLowerCase() === textMsg.toLowerCase())) {
        const typeStr = validCallTypes.find(t => t.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        
        await sessionService.updateSession(from, { callType: typeStr });
        
        // Validation logic for Warranty/AMC
        const m = machines.find(mac => mac.serialNumber === session.selectedMachineSerialNumber);
        
        if (typeStr === 'Warranty') {
          const activeW = m?.contract?.type === 'Warranty' && isContractActive(m.contract.startDate, m.contract.endDate);
          if (!activeW) {
            await whatsappService.sendMessage(textMessage(from, 'For this machine, there is no active warranty.'));
            await askCallType(from);
            break;
          } else {
            await whatsappService.sendMessage(textMessage(from, `Active Warranty\nDuration: ${m.contract.duration}\nValid From: ${formatDate(m.contract.startDate)}\nValid Until: ${formatDate(m.contract.endDate)}`));
          }
        } else if (typeStr === 'AMC') {
          const activeA = m?.contract?.type === 'AMC' && isContractActive(m.contract.startDate, m.contract.endDate);
          if (!activeA) {
            await whatsappService.sendMessage(textMessage(from, 'For this machine, there is no active AMC.'));
            await askCallType(from);
            break;
          } else {
            await whatsappService.sendMessage(textMessage(from, `Active AMC found.\nValid From: ${formatDate(m.contract.startDate)}\nValid Until: ${formatDate(m.contract.endDate)}\nAvailable Visits: ${m.contract.visits}`));
          }
        }
        
        await askCategory(from);
        await sessionService.updateSession(from, { state: 'SELECT_CATEGORY' });
      } else {
        await askCallType(from);
      }
      break;

    case 'SELECT_CATEGORY':
      const validCategories = ['Quality Issue', 'Wiper Issue', 'Installation', 'Calibration', 'Spare Part', 'Others'];
      if (validCategories.includes(textMsg) || validCategories.some(c => c.toLowerCase() === textMsg.toLowerCase())) {
        const catStr = validCategories.find(c => c.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { category: catStr, state: 'SELECT_PRIORITY' });
        await askPriority(from);
      } else {
        await askCategory(from);
      }
      break;

    case 'SELECT_PRIORITY':
      const validPrios = ['Low', 'Medium', 'High', 'Urgent'];
      if (validPrios.includes(textMsg) || validPrios.some(p => p.toLowerCase() === textMsg.toLowerCase())) {
        const prioStr = validPrios.find(p => p.toLowerCase() === textMsg.toLowerCase()) || textMsg;
        await sessionService.updateSession(from, { priority: prioStr, state: 'ENTER_DESCRIPTION' });
        await whatsappService.sendMessage(textMessage(from, 'Please enter a description of the issue.'));
      } else {
        await askPriority(from);
      }
      break;

    case 'ENTER_DESCRIPTION':
      const desc = textMsg;
      const finalSession = await sessionService.updateSession(from, { description: desc, state: 'TICKET_CONFIRMATION' });
      
      const selMachine = machines.find(mac => mac.serialNumber === finalSession.selectedMachineSerialNumber);
      
      const summary = `Please confirm your ticket:\n\nCompany: ${finalSession.company}\nMachine: ${selMachine?.machineType || ''}\nModel: ${selMachine?.model || ''}\nSerial Number: ${finalSession.selectedMachineSerialNumber}\nCall Type: ${finalSession.callType}\nCategory: ${finalSession.category}\nPriority: ${finalSession.priority}\nDescription: ${desc}\n\nDo you want to create this ticket?`;
      
      await whatsappService.sendMessage(interactiveButtons(from, summary, [
        { id: 'confirm_ticket', title: 'CONFIRM' },
        { id: 'cancel_ticket', title: 'CANCEL' }
      ]));
      break;

    case 'TICKET_CONFIRMATION':
      if (textMsg.toLowerCase() === 'confirm_ticket' || textMsg.toLowerCase() === 'confirm') {
        const selM = machines.find(mac => mac.serialNumber === session.selectedMachineSerialNumber);
        
        const res = await ticketService.createTicket({
          companyProfileId: session.companyProfileId,
          whatsappNumber: from,
          machineSerialNumber: session.selectedMachineSerialNumber,
          machineModel: selM?.model,
          callType: session.callType,
          category: session.category,
          priority: session.priority,
          description: session.description
        });
        
        if (res.success) {
          await whatsappService.sendMessage(textMessage(from, `✅ Ticket created successfully.\n\nTicket Number: ${res.ticketNumber}\n\nOur support team will contact you shortly.`));
        } else {
          await whatsappService.sendMessage(textMessage(from, 'Sorry, we could not create your ticket right now.\n\nPlease contact our support team.'));
        }
        await sessionService.clearSession(from);
      } else {
        await whatsappService.sendMessage(textMessage(from, 'Ticket creation cancelled.'));
        await sessionService.clearSession(from);
      }
      break;
  }
}

async function askCallType(from) {
  const sections = [{
    title: 'Call Types',
    rows: [
      { id: 'Pre-Install', title: 'Pre-Install' },
      { id: 'Installation', title: 'Installation & Comm' }, // WhatsApp title limit 24 chars
      { id: 'Warranty', title: 'Warranty' },
      { id: 'AMC', title: 'AMC' },
      { id: 'Out of Warranty', title: 'Out of Warranty' },
      { id: 'Courtesy Visit', title: 'Courtesy Visit' },
      { id: 'Others', title: 'Others' }
    ]
  }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select the call type.', 'Call Types', sections));
}

async function askCategory(from) {
  const sections = [{
    title: 'Categories',
    rows: [
      { id: 'Quality Issue', title: 'Quality Issue' },
      { id: 'Wiper Issue', title: 'Wiper Issue' },
      { id: 'Installation', title: 'Installation' },
      { id: 'Calibration', title: 'Calibration' },
      { id: 'Spare Part', title: 'Spare Part' },
      { id: 'Others', title: 'Others' }
    ]
  }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select the issue category.', 'Categories', sections));
}

async function askPriority(from) {
  const sections = [{
    title: 'Priority',
    rows: [
      { id: 'Low', title: 'Low' },
      { id: 'Medium', title: 'Medium' },
      { id: 'High', title: 'High' },
      { id: 'Urgent', title: 'Urgent' }
    ]
  }];
  await whatsappService.sendMessage(interactiveList(from, 'Please select the ticket priority.', 'Priority', sections));
}

module.exports = {
  handleTicketFlow
};
