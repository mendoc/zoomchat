import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Commande /start - Présentation du bot
 */
export class StartCommand {
  /**
   * @param {SubscriberRepository} subscriberRepo
   */
  constructor(subscriberRepo) {
    this.subscriberRepo = subscriberRepo;
  }

  /**
   * Gère la commande /start
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const chatId = ctx.chat.id;
    const user = ctx.from;

    try {
      logger.info({ chatId }, 'Commande /start reçue');

      // Enregistre l'utilisateur s'il n'existe pas
      const subscriber = await this.subscriberRepo.findOrCreate(chatId, {
        firstName: user.first_name,
        lastName: user.last_name,
        username: user.username,
      });

      // Construire le message
      let message = `${botMessages.start.greeting}\n\n`;
      message += `${botMessages.start.description}\n\n`;
      message += `${botMessages.start.canHelp}\n`;
      message += `${botMessages.start.categories.join('\n')}\n\n`;
      message += `${botMessages.start.howToUse}\n\n`;
      message += `${botMessages.start.subscribe}\n\n`;
      message += botMessages.start.tryNow;

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

      logger.info({ chatId, isSubscribed }, 'Message /start envoyé');
    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de /start');
      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer.');
    }
  }
}
