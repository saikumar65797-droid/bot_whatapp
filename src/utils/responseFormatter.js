// Formats messages for WhatsApp Cloud API

function textMessage(to, text) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };
}

function interactiveButtons(to, bodyText, buttons) {
  // WhatsApp allows max 3 buttons, and titles must be max 20 chars
  const formattedButtons = buttons.slice(0, 3).map((btn, index) => ({
    type: 'reply',
    reply: {
      id: btn.id || `btn_${index}`,
      title: btn.title.substring(0, 20)
    }
  }));

  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: formattedButtons
      }
    }
  };
}

function interactiveList(to, bodyText, buttonText, sections) {
  // sections format: [{ title: '...', rows: [{ id: '...', title: '...', description: '...' }] }]
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: {
        button: buttonText.substring(0, 20),
        sections: sections
      }
    }
  };
}

module.exports = {
  textMessage,
  interactiveButtons,
  interactiveList
};
