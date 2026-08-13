const whatsappService = require('./whatsappService');
const sendMessage = (...args) => whatsappService.sendMessage(...args);
const sendButtonsMessage = (...args) => whatsappService.sendButtonsMessage(...args);
const sendListMessage = (...args) => whatsappService.sendListMessage(...args);
const sendDocumentMessage = (...args) => whatsappService.sendDocumentMessage(...args);
const { findMatchingCompanyProfile, normalizeMobile, normalizeEmail } = require('./companyProfileService');
const { createTicket } = require('./ticketService');
const { createMachineRequest } = require('./machineRequestService');
const { createLead, updateLeadBrochureStatus } = require('./leadService');
const { getUserState, setUserState, clearUserState } = require('../utils/userState');

// Conversation States
const STATES = {
  START: 'START',
  WAITING_CUSTOMER_TYPE: 'WAITING_CUSTOMER_TYPE',
  WAITING_REGISTERED_MOBILE: 'WAITING_REGISTERED_MOBILE',
  WAITING_REGISTERED_EMAIL: 'WAITING_REGISTERED_EMAIL',
  VERIFYING_CUSTOMER: 'VERIFYING_CUSTOMER',
  WAITING_PROFILE_CONFIRMATION: 'WAITING_PROFILE_CONFIRMATION',
  WAITING_SERVICE_OPTION: 'WAITING_SERVICE_OPTION',
  WAITING_MACHINE_SELECTION: 'WAITING_MACHINE_SELECTION',
  WAITING_CALL_TYPE: 'WAITING_CALL_TYPE',
  WAITING_CATEGORY: 'WAITING_CATEGORY',
  WAITING_PRIORITY: 'WAITING_PRIORITY',
  WAITING_DESCRIPTION: 'WAITING_DESCRIPTION',
  WAITING_MACHINE_TYPE: 'WAITING_MACHINE_TYPE',
  WAITING_MACHINE_MODEL: 'WAITING_MACHINE_MODEL',
  WAITING_NUMBER_OF_CHUTES: 'WAITING_NUMBER_OF_CHUTES',
  WAITING_GRAIN_TYPE: 'WAITING_GRAIN_TYPE',
  WAITING_NEW_CUSTOMER_NAME: 'WAITING_NEW_CUSTOMER_NAME',
  WAITING_NEW_CUSTOMER_MOBILE: 'WAITING_NEW_CUSTOMER_MOBILE',
  WAITING_NEW_CUSTOMER_EMAIL: 'WAITING_NEW_CUSTOMER_EMAIL',
  WAITING_FACTORY_NAME: 'WAITING_FACTORY_NAME',
  WAITING_ADDRESS: 'WAITING_ADDRESS',
  WAITING_INTERESTED_MACHINE_TYPE: 'WAITING_INTERESTED_MACHINE_TYPE',
  WAITING_BROCHURE_CONFIRMATION: 'WAITING_BROCHURE_CONFIRMATION',
  COMPLETED: 'COMPLETED'
};

/**
 * Step 1: Send Greeting & Ask Customer Type (Existing Customer YES/NO)
 */
const sendInitialGreeting = async (from) => {
  setUserState(from, { state: STATES.WAITING_CUSTOMER_TYPE });

  const greetingText =
    'Hello! 👋\n\n' +
    'Welcome to Sruthi Technologies.\n\n' +
    'Thank you for contacting us.\n\n' +
    'Are you an existing customer?';

  const buttons = [
    { id: 'existing_customer_yes', title: 'Yes' },
    { id: 'existing_customer_no', title: 'No' }
  ];

  await sendButtonsMessage(from, greetingText, buttons);
};

/**
 * Helper to prompt Machine Type List Message
 */
const sendMachineTypeOptions = async (from, promptText = 'Please select the machine type:') => {
  const rows = [
    { id: 'mtype_sorter', title: 'Sorter', description: 'Color / AI Optical Sorter' },
    { id: 'mtype_packing', title: 'Packing Machine', description: 'Automated packing machinery' },
    { id: 'mtype_classifier', title: 'Classifier', description: 'Vibro Classifier' },
    { id: 'mtype_destoner', title: 'Destoner', description: 'Vibro / Magnetic Destoner' },
    { id: 'mtype_compressor', title: 'Air Compressor', description: 'Industrial Air Compressor' },
    { id: 'mtype_ups', title: 'UPS', description: 'Uninterruptible Power Supply' },
    { id: 'mtype_dryers', title: 'Grain Dryers', description: 'Grain Drying Systems' },
    { id: 'mtype_elevator', title: 'Elevator', description: 'Bucket Elevator' },
    { id: 'mtype_dall_plant', title: 'Dall Plant', description: 'Complete Pulse Processing' },
    { id: 'mtype_rice_plant', title: 'Rice Plant', description: 'Complete Rice Milling' }
  ];

  await sendListMessage(
    from,
    'Machine Type',
    promptText + '\n\n(Or type your custom machine type)',
    'Select Machine Type',
    [{ title: 'Machine Types', rows }]
  );
};

/**
 * Helper to prompt Machine Model List Message
 */
const sendMachineModelOptions = async (from) => {
  const rows = [
    { id: 'mmodel_others', title: 'Others', description: 'Other machine model' },
    { id: 'mmodel_rgbs', title: 'RGBS', description: 'RGBS Series Model' },
    { id: 'mmodel_ultima', title: 'Ultima', description: 'Ultima Premium Model' },
    { id: 'mmodel_ultra_s', title: 'Ultra S', description: 'Ultra S Advanced Model' },
    { id: 'mmodel_ultra_si', title: 'Ultra SI', description: 'Ultra SI Smart Model' },
    { id: 'mmodel_falcon', title: 'FALCON', description: 'FALCON High-Speed Model' },
    { id: 'mmodel_fcs', title: 'FCS', description: 'FCS Compact Model' }
  ];

  await sendListMessage(
    from,
    'Machine Model',
    'Please select the machine model:\n\n(Or type custom model name)',
    'Select Model',
    [{ title: 'Machine Models', rows }]
  );
};

/**
 * Helper to prompt Chutes Count Options
 */
const sendChutesOptions = async (from) => {
  const rows = [
    { id: 'chutes_1', title: '1', description: '1 Chute' },
    { id: 'chutes_2', title: '2', description: '2 Chutes' },
    { id: 'chutes_3', title: '3', description: '3 Chutes' },
    { id: 'chutes_4', title: '4', description: '4 Chutes' },
    { id: 'chutes_5', title: '5', description: '5 Chutes' },
    { id: 'chutes_6', title: '6', description: '6 Chutes' },
    { id: 'chutes_7', title: '7', description: '7 Chutes' }
  ];

  await sendListMessage(
    from,
    'Chutes Count',
    'Please select the number of chutes:\n\n(Or type a numeric value)',
    'Select Chutes',
    [{ title: 'Chutes Options', rows }]
  );
};

/**
 * Parse Machine Type ID or return raw text
 */
const parseMachineType = (text, buttonId) => {
  const map = {
    'mtype_sorter': 'Sorter',
    'mtype_packing': 'Packing Machine',
    'mtype_classifier': 'Classifier',
    'mtype_destoner': 'Destoner',
    'mtype_compressor': 'Air Compressor',
    'mtype_ups': 'UPS',
    'mtype_dryers': 'Grain Dryers',
    'mtype_elevator': 'Elevator',
    'mtype_dall_plant': 'Dall Plant',
    'mtype_rice_plant': 'Rice Plant'
  };
  return map[buttonId] || text;
};

/**
 * Parse Machine Model ID or return raw text
 */
const parseMachineModel = (text, buttonId) => {
  const map = {
    'mmodel_others': 'Others',
    'mmodel_rgbs': 'RGBS',
    'mmodel_ultima': 'Ultima',
    'mmodel_ultra_s': 'Ultra S',
    'mmodel_ultra_si': 'Ultra SI',
    'mmodel_falcon': 'FALCON',
    'mmodel_fcs': 'FCS'
  };
  return map[buttonId] || text;
};

/**
 * Parse Chutes count or return raw number
 */
const parseChutesCount = (text, buttonId) => {
  if (buttonId && buttonId.startsWith('chutes_')) {
    const num = buttonId.replace('chutes_', '');
    return parseInt(num, 10);
  }
  const clean = text.trim();
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }
  return NaN;
};

/**
 * Core Chatbot Incoming Message Processor
 * @param {string} from Sender WhatsApp phone number
 * @param {object} messageData Message object containing { text, buttonId, listRowId }
 */
const processIncomingMessage = async (from, messageData) => {
  const text = (messageData.text || '').trim();
  const lowerText = text.toLowerCase();
  const buttonId = messageData.buttonId || messageData.listRowId || '';

  const isRestartTrigger = ['hi', 'hello', 'hey', 'start', 'restart', 'menu'].includes(lowerText);
  let currentState = getUserState(from);

  // If new conversation or explicit restart trigger, start at Greeting
  if (!currentState || !currentState.state || isRestartTrigger) {
    await sendInitialGreeting(from);
    return;
  }

  // Handle explicit Contact Team action
  if (buttonId === 'contact_team' || lowerText === 'contact team' || lowerText === 'contact_team') {
    const contactMsg =
      'No problem. Please contact our support team directly:\n\n' +
      '📞 +91-70759 24366\n' +
      '✉️ceo@sruthitechnologies.com\n\n' +
      "They'll be happy to assist you";
    await sendMessage(from, contactMsg);
    clearUserState(from);
    return;
  }

  // Handle Retry Verification action
  if (buttonId === 'retry_verification' || lowerText === 'try again' || lowerText === 'retry') {
    setUserState(from, {
      state: STATES.WAITING_REGISTERED_MOBILE,
      customer_type: 'EXISTING'
    });
    await sendMessage(from, 'Please enter your registered mobile number.');
    return;
  }

  switch (currentState.state) {
    // ----------------------------------------------------
    // STEP 1: WAITING_CUSTOMER_TYPE (Yes / No)
    // ----------------------------------------------------
    case STATES.WAITING_CUSTOMER_TYPE: {
      const isExisting = buttonId === 'existing_customer_yes' || ['yes', 'y', '1'].includes(lowerText);
      const isNew = buttonId === 'existing_customer_no' || ['no', 'n', '2'].includes(lowerText);

      if (isExisting) {
        // Existing Customer Flow -> Ask Registered Mobile
        setUserState(from, {
          state: STATES.WAITING_REGISTERED_MOBILE,
          customer_type: 'EXISTING'
        });
        await sendMessage(from, 'Please enter your registered mobile number.');
        return;
      }

      if (isNew) {
        // Non-Existing Customer Flow -> Start Lead capture
        setUserState(from, {
          state: STATES.WAITING_NEW_CUSTOMER_NAME,
          customer_type: 'NON_EXISTING'
        });
        await sendMessage(from, 'Please enter your name.');
        return;
      }

      // Re-prompt Greeting Buttons if unhandled input
      await sendInitialGreeting(from);
      break;
    }

    // ----------------------------------------------------
    // EXISTING CUSTOMER FLOW: MOBILE & EMAIL VERIFICATION
    // ----------------------------------------------------
    case STATES.WAITING_REGISTERED_MOBILE: {
      const normMobile = normalizeMobile(text);
      const isValidMobile = /^[6-9]\d{9}$/.test(normMobile) || /^\d{10}$/.test(normMobile);

      if (!isValidMobile) {
        await sendMessage(from, 'Please enter a valid registered mobile number.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_REGISTERED_EMAIL,
        registered_mobile: normMobile
      });

      await sendMessage(from, 'Thank you.\n\nPlease enter your registered email address.');
      break;
    }

    case STATES.WAITING_REGISTERED_EMAIL: {
      const normEmail = normalizeEmail(text);
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail);

      if (!isValidEmail) {
        await sendMessage(from, 'Please enter a valid registered email address.');
        return;
      }

      const regMobile = currentState.registered_mobile;

      // Lookup company profile in MongoDB
      const profile = await findMatchingCompanyProfile(regMobile, normEmail);

      if (!profile || !profile.companyProfileName) {
        const notFoundText =
          'We could not find a company profile matching those registered details.\n\n' +
          'Please check your mobile number and email address and try again.';
        const buttons = [
          { id: 'retry_verification', title: 'Try Again' },
          { id: 'contact_team', title: 'Contact Team' }
        ];
        setUserState(from, { state: STATES.WAITING_REGISTERED_MOBILE });
        await sendButtonsMessage(from, notFoundText, buttons);
        return;
      }

      // Profile Found -> Extract details dynamically
      const companyName = profile.companyProfileName;
      const stateName = profile.rawDoc.address?.state || 'N/A';
      const districtName = profile.rawDoc.address?.districtArea || profile.rawDoc.address?.district || 'N/A';
      const profileId = profile.rawDoc._id || profile.profileCode || 'N/A';

      setUserState(from, {
        state: STATES.WAITING_PROFILE_CONFIRMATION,
        registered_email: normEmail,
        company_profile_id: profileId,
        company_name: companyName,
        state_name: stateName,
        district: districtName
      });

      const confirmText =
        'Thank you for verifying your details. ✅\n\n' +
        'We found your registered profile:\n\n' +
        `*Company:* ${companyName}\n` +
        `*State:* ${stateName}\n` +
        `*District/Area:* ${districtName}\n\n` +
        'Is this your company profile?';

      const buttons = [
        { id: 'confirm_profile_yes', title: 'Yes' },
        { id: 'confirm_profile_no', title: 'No' }
      ];

      await sendButtonsMessage(from, confirmText, buttons);
      break;
    }

    case STATES.WAITING_PROFILE_CONFIRMATION: {
      const isConfirmYes = buttonId === 'confirm_profile_yes' || ['yes', 'y', '1'].includes(lowerText);
      const isConfirmNo = buttonId === 'confirm_profile_no' || ['no', 'n', '2'].includes(lowerText);

      if (isConfirmNo) {
        await sendMessage(from, 'Please contact our team for further assistance.');
        clearUserState(from);
        return;
      }

      if (isConfirmYes) {
        setUserState(from, { state: STATES.WAITING_SERVICE_OPTION });
        const serviceText = 'How can we help you today?';
        const buttons = [
          { id: 'service_raise_ticket', title: 'Raise a Ticket' },
          { id: 'service_add_machine', title: 'Add a New Machine' }
        ];
        await sendButtonsMessage(from, serviceText, buttons);
        return;
      }

      // Fallback profile confirmation prompt
      const cName = currentState.company_name || 'your company';
      const promptText = `Is *${cName}* your company profile?`;
      const buttons = [
        { id: 'confirm_profile_yes', title: 'Yes' },
        { id: 'confirm_profile_no', title: 'No' }
      ];
      await sendButtonsMessage(from, promptText, buttons);
      break;
    }

    case STATES.WAITING_SERVICE_OPTION: {
      const isRaiseTicket = buttonId === 'service_raise_ticket' || lowerText.includes('ticket') || lowerText === '1';
      const isAddMachine = buttonId === 'service_add_machine' || lowerText.includes('machine') || lowerText === '2';

      if (isRaiseTicket) {
        // Step 7: Raise a Ticket -> Show machines list message
        setUserState(from, { state: STATES.WAITING_MACHINE_SELECTION });

        const rows = [
          { id: 'machine_001', title: 'Machine 001', description: 'Primary Color Sorter' },
          { id: 'machine_002', title: 'Machine 002', description: 'Secondary Grain Sorter' },
          { id: 'machine_003', title: 'Machine 003', description: 'Auxiliary Sorting Machine' }
        ];

        await sendListMessage(
          from,
          'Select Machine',
          'Please select the machine for which you want to raise a ticket:',
          'Select Machine',
          [{ title: 'Registered Machines', rows }]
        );
        return;
      }

      if (isAddMachine) {
        // Step 13: Add New Machine -> Q1 Machine Type (Send Interactive List Options)
        setUserState(from, { state: STATES.WAITING_MACHINE_TYPE });
        await sendMachineTypeOptions(from, 'Please select the machine type:');
        return;
      }

      // Fallback service options prompt
      const serviceText = 'How can we help you today?';
      const buttons = [
        { id: 'service_raise_ticket', title: 'Raise a Ticket' },
        { id: 'service_add_machine', title: 'Add a New Machine' }
      ];
      await sendButtonsMessage(from, serviceText, buttons);
      break;
    }

    // ----------------------------------------------------
    // RAISE A TICKET SUB-FLOW
    // ----------------------------------------------------
    case STATES.WAITING_MACHINE_SELECTION: {
      let selectedMachine = text;
      if (buttonId.startsWith('machine_')) {
        selectedMachine = buttonId.replace('machine_', 'Machine ').toUpperCase();
      }

      setUserState(from, {
        state: STATES.WAITING_CALL_TYPE,
        selected_machine_id: selectedMachine
      });

      // Call Type List Message
      const rows = [
        { id: 'call_type_pre_install', title: 'Pre-Install', description: 'Pre-installation service call' },
        { id: 'call_type_installation', title: 'Installation & Comm', description: 'Installation & Commissioning' },
        { id: 'call_type_warranty', title: 'Warranty', description: 'Warranty covered call' },
        { id: 'call_type_out_warranty', title: 'Out of Warranty', description: 'Chargeable service call' },
        { id: 'call_type_amc', title: 'AMC', description: 'Annual Maintenance Contract' },
        { id: 'call_type_courtesy', title: 'Courtesy Visit', description: 'Routine check visit' },
        { id: 'call_type_others', title: 'Others', description: 'Other service requirement' }
      ];

      await sendListMessage(
        from,
        'Select Call Type',
        'Please select the Call Type:',
        'Select Call Type',
        [{ title: 'Call Types', rows }]
      );
      break;
    }

    case STATES.WAITING_CALL_TYPE: {
      let callType = text;
      const callTypeMap = {
        'call_type_pre_install': 'Pre-Install',
        'call_type_installation': 'Installation & Commissioning',
        'call_type_warranty': 'Warranty',
        'call_type_out_warranty': 'Out of Warranty (Chargeable)',
        'call_type_amc': 'AMC',
        'call_type_courtesy': 'Courtesy Visit',
        'call_type_others': 'Others'
      };
      if (callTypeMap[buttonId]) {
        callType = callTypeMap[buttonId];
      }

      setUserState(from, {
        state: STATES.WAITING_CATEGORY,
        call_type: callType
      });

      // Category List Message
      const rows = [
        { id: 'cat_quality', title: 'Quality Issue', description: 'Sorting accuracy / quality' },
        { id: 'cat_wiper', title: 'Wiper Issue', description: 'Wiper / cleaning mechanism' },
        { id: 'cat_installation', title: 'Installation', description: 'Installation related query' },
        { id: 'cat_calibration', title: 'Calibration', description: 'Camera / sensor calibration' },
        { id: 'cat_spare', title: 'Spare Part', description: 'Component replacement' },
        { id: 'cat_other', title: 'Other', description: 'General issue' }
      ];

      await sendListMessage(
        from,
        'Select Category',
        'Please select the Category:',
        'Select Category',
        [{ title: 'Categories', rows }]
      );
      break;
    }

    case STATES.WAITING_CATEGORY: {
      let category = text;
      const catMap = {
        'cat_quality': 'Quality Issue',
        'cat_wiper': 'Wiper Issue',
        'cat_installation': 'Installation',
        'cat_calibration': 'Calibration',
        'cat_spare': 'Spare Part',
        'cat_other': 'Other'
      };
      if (catMap[buttonId]) {
        category = catMap[buttonId];
      }

      setUserState(from, {
        state: STATES.WAITING_PRIORITY,
        category: category
      });

      // Priority Buttons
      const buttons = [
        { id: 'priority_low', title: 'LOW' },
        { id: 'priority_medium', title: 'MEDIUM' },
        { id: 'priority_high', title: 'HIGH' }
      ];

      await sendButtonsMessage(from, 'Please select the Priority:', buttons);
      break;
    }

    case STATES.WAITING_PRIORITY: {
      let priority = text.toUpperCase();
      const prioMap = {
        'priority_low': 'LOW',
        'priority_medium': 'MEDIUM',
        'priority_high': 'HIGH',
        'priority_urgent': 'URGENT'
      };
      if (prioMap[buttonId]) {
        priority = prioMap[buttonId];
      }

      setUserState(from, {
        state: STATES.WAITING_DESCRIPTION,
        priority: priority
      });

      await sendMessage(from, 'Please describe the issue.');
      break;
    }

    case STATES.WAITING_DESCRIPTION: {
      if (!text) {
        await sendMessage(from, 'Please describe the issue.');
        return;
      }

      const {
        registered_mobile,
        registered_email,
        company_profile_id,
        company_name,
        state_name,
        district,
        selected_machine_id,
        call_type,
        category,
        priority
      } = currentState;

      try {
        const ticketDoc = await createTicket({
          customerMobile: registered_mobile,
          customerEmail: registered_email,
          companyProfileId: company_profile_id,
          companyName: company_name,
          state: state_name,
          district: district,
          selectedMachineId: selected_machine_id,
          callType: call_type,
          category: category,
          priority: priority,
          description: text
        });

        const successText =
          'Your ticket has been successfully booked. ✅\n\n' +
          `Ticket ID: *${ticketDoc.ticketId}*\n\n` +
          'Our team will review your request and contact you soon.';

        await sendMessage(from, successText);
        clearUserState(from);
      } catch (err) {
        console.error('❌ Error creating ticket:', err);
        await sendMessage(from, 'An error occurred while creating your ticket. Please try again later.');
      }
      break;
    }

    // ----------------------------------------------------
    // ADD NEW MACHINE SUB-FLOW (WITH EXACT DROPDOWN VALUES)
    // ----------------------------------------------------
    case STATES.WAITING_MACHINE_TYPE: {
      const selectedMachineType = parseMachineType(text, buttonId);
      if (!selectedMachineType) {
        await sendMachineTypeOptions(from, 'Please select the machine type:');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_MACHINE_MODEL,
        machine_type: selectedMachineType
      });

      // Prompt Machine Model Options
      await sendMachineModelOptions(from);
      break;
    }

    case STATES.WAITING_MACHINE_MODEL: {
      const selectedModel = parseMachineModel(text, buttonId);
      if (!selectedModel) {
        await sendMachineModelOptions(from);
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_NUMBER_OF_CHUTES,
        machine_model: selectedModel
      });

      // Prompt Chutes Options
      await sendChutesOptions(from);
      break;
    }

    case STATES.WAITING_NUMBER_OF_CHUTES: {
      const chutesCount = parseChutesCount(text, buttonId);
      if (isNaN(chutesCount)) {
        await sendChutesOptions(from);
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_GRAIN_TYPE,
        number_of_chutes: chutesCount
      });

      await sendMessage(from, 'Please enter the grain type.');
      break;
    }

    case STATES.WAITING_GRAIN_TYPE: {
      if (!text) {
        await sendMessage(from, 'Please enter the grain type.');
        return;
      }

      const {
        registered_mobile,
        registered_email,
        company_profile_id,
        company_name,
        state_name,
        district,
        machine_type,
        machine_model,
        number_of_chutes
      } = currentState;

      try {
        const reqDoc = await createMachineRequest({
          customerMobile: registered_mobile,
          customerEmail: registered_email,
          companyProfileId: company_profile_id,
          companyName: company_name,
          state: state_name,
          district: district,
          machineType: machine_type,
          machineModel: machine_model,
          numberOfChutes: number_of_chutes,
          grainType: text
        });

        const successText =
          'Your new machine request has been successfully submitted. ✅\n\n' +
          `Request ID: *${reqDoc.requestId}*\n\n` +
          'Our team will contact you very soon.';

        await sendMessage(from, successText);
        clearUserState(from);
      } catch (err) {
        console.error('❌ Error creating machine request:', err);
        await sendMessage(from, 'An error occurred while submitting your machine request. Please try again later.');
      }
      break;
    }

    // ----------------------------------------------------
    // NON-EXISTING CUSTOMER (LEAD ENQUIRY) FLOW
    // ----------------------------------------------------
    case STATES.WAITING_NEW_CUSTOMER_NAME: {
      if (!text) {
        await sendMessage(from, 'Please enter your name.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_NEW_CUSTOMER_MOBILE,
        new_name: text
      });

      await sendMessage(from, 'Please enter your mobile number.');
      break;
    }

    case STATES.WAITING_NEW_CUSTOMER_MOBILE: {
      const normMobile = normalizeMobile(text);
      const isValidMobile = /^[6-9]\d{9}$/.test(normMobile) || /^\d{10}$/.test(normMobile);

      if (!isValidMobile) {
        await sendMessage(from, 'Please enter a valid 10-digit mobile number.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_NEW_CUSTOMER_EMAIL,
        new_mobile: normMobile
      });

      await sendMessage(from, 'Please enter your email address.');
      break;
    }

    case STATES.WAITING_NEW_CUSTOMER_EMAIL: {
      const normEmail = normalizeEmail(text);
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail);

      if (!isValidEmail) {
        await sendMessage(from, 'Please enter a valid email address.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_FACTORY_NAME,
        new_email: normEmail
      });

      await sendMessage(from, 'Please enter your factory/company name.');
      break;
    }

    case STATES.WAITING_FACTORY_NAME: {
      if (!text) {
        await sendMessage(from, 'Please enter your factory/company name.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_ADDRESS,
        factory_name: text
      });

      await sendMessage(from, 'Please enter your factory/address.');
      break;
    }

    case STATES.WAITING_ADDRESS: {
      if (!text) {
        await sendMessage(from, 'Please enter your factory/address.');
        return;
      }

      setUserState(from, {
        state: STATES.WAITING_INTERESTED_MACHINE_TYPE,
        address: text
      });

      // Prompt Machine Type options for Non-Existing Customer
      await sendMachineTypeOptions(from, 'Please select the machine type you are interested in:');
      break;
    }

    case STATES.WAITING_INTERESTED_MACHINE_TYPE: {
      const selectedMachineType = parseMachineType(text, buttonId);
      if (!selectedMachineType) {
        await sendMachineTypeOptions(from, 'Please select the machine type you are interested in:');
        return;
      }

      const { new_name, new_mobile, new_email, factory_name, address } = currentState;

      try {
        const leadDoc = await createLead({
          name: new_name,
          mobile: new_mobile,
          email: new_email,
          factoryName: factory_name,
          address: address,
          machineType: selectedMachineType
        });

        setUserState(from, {
          state: STATES.WAITING_BROCHURE_CONFIRMATION,
          lead_id: leadDoc.leadId
        });

        const brochureText = 'Would you like to receive our machine brochure?';
        const buttons = [
          { id: 'brochure_yes', title: 'Yes' },
          { id: 'brochure_no', title: 'No' }
        ];

        await sendButtonsMessage(from, brochureText, buttons);
      } catch (err) {
        console.error('❌ Error creating lead:', err);
        await sendMessage(from, 'An error occurred while saving your enquiry. Please try again later.');
      }
      break;
    }

    case STATES.WAITING_BROCHURE_CONFIRMATION: {
      const isBrochureYes = buttonId === 'brochure_yes' || ['yes', 'y', '1'].includes(lowerText);
      const isBrochureNo = buttonId === 'brochure_no' || ['no', 'n', '2'].includes(lowerText);
      const leadId = currentState.lead_id;

      if (isBrochureYes) {
        const brochureUrl = process.env.BROCHURE_URL || 'http://localhost:5000/public/Sruthi_Technologies_Brochure.pdf';
        
        // 1. Send Document Message via WhatsApp Cloud API
        await sendDocumentMessage(
          from,
          brochureUrl,
          'Sruthi_Technologies_Brochure.pdf',
          'Sruthi Technologies Product Catalog & Brochure 📄'
        );

        // 2. ALSO send a direct text message confirmation with brochure details & website link
        const confirmationMsg =
          'Thank you! 📄\n\n' +
          'Our official Sruthi Technologies Product Catalog & Brochure has been sent.\n\n' +
          'You can also visit our official website:\n' +
          '🌐 https://www.sruthitechnologies.com\n\n' +
          'Our team will contact you soon for further assistance.';

        await sendMessage(from, confirmationMsg);

        if (leadId) {
          await updateLeadBrochureStatus(leadId, true, true);
        }

        clearUserState(from);
        return;
      }

      if (isBrochureNo) {
        if (leadId) {
          await updateLeadBrochureStatus(leadId, false, false);
        }

        await sendMessage(from, 'Thank you for sharing your details. 🙏\n\nOur team will contact you very soon.');
        clearUserState(from);
        return;
      }

      // Fallback brochure prompt
      const brochureText = 'Would you like to receive our machine brochure?';
      const buttons = [
        { id: 'brochure_yes', title: 'Yes' },
        { id: 'brochure_no', title: 'No' }
      ];
      await sendButtonsMessage(from, brochureText, buttons);
      break;
    }

    default: {
      await sendInitialGreeting(from);
      break;
    }
  }
};

module.exports = {
  STATES,
  sendInitialGreeting,
  processIncomingMessage
};
