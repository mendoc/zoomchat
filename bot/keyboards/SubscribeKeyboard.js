import { botMessages } from '../../locales/bot-messages.js';

/**
 * Crée le clavier inline avec le bouton S'abonner
 * @returns {object} Configuration du clavier inline
 */
export function createSubscribeKeyboard() {
  return {
    inline_keyboard: [[{ text: botMessages.callback.subscribeButton, callback_data: 'subscribe' }]],
  };
}
