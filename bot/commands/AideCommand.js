import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Commande /aide - Affiche l'aide et les exemples
 */
export class AideCommand {
  /**
   * @param {SubscriberRepository} subscriberRepo
   */
  constructor(subscriberRepo) {
    this.subscriberRepo = subscriberRepo;
  }

  /**
   * Gère la commande /aide
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const chatId = ctx.chat.id;

    try {
      logger.info({ chatId }, 'Commande /aide reçue');

      // Construire le message d'aide
      let message = `${botMessages.help.title}\n\n`;
      message += `${botMessages.help.howToSearch}\n`;
      message += `${botMessages.help.searchDescription}\n\n`;
      message += `${botMessages.help.examplesTitle}\n`;
      message += `${botMessages.help.examples.join('\n')}\n\n`;
      message += `${botMessages.help.categoriesTitle}\n`;
      message += `${botMessages.help.categoriesList}\n\n`;
      message += `${botMessages.help.commandsTitle}\n`;
      message += botMessages.help.commands.join('\n');

      // Vérifier si l'utilisateur est abonné
      const subscriber = await this.subscriberRepo.getByChatId(chatId);
      const isSubscribed = subscriber && subscriber.actif;

      // Afficher le bouton S'abonner uniquement si pas abonné
      const replyMarkup = isSubscribed
        ? {}
        : {
            reply_markup: {
              inline_keyboard: [
                [{ text: botMessages.callback.subscribeButton, callback_data: 'subscribe' }],
              ],
            },
          };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...replyMarkup,
      });

      logger.info({ chatId }, 'Message /aide envoyé');
    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de /aide');
      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer.');
    }
  }
}
