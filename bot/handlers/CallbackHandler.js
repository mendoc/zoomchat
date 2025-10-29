import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Handler pour les callback queries (boutons inline)
 */
export class CallbackHandler {
  /**
   * @param {SubscriberRepository} subscriberRepo
   * @param {AdminNotifier} adminNotifier
   */
  constructor(subscriberRepo, adminNotifier) {
    this.subscriberRepo = subscriberRepo;
    this.adminNotifier = adminNotifier;
  }

  /**
   * Gère les callback queries
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const callbackData = ctx.callbackQuery.data;
    const chatId = ctx.chat.id;
    const nom = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
    const username = ctx.from.username;

    try {
      logger.info({ chatId, callbackData }, 'Callback query reçu');

      if (callbackData === 'subscribe') {
        // Vérifier si déjà abonné
        const existingSubscriber = await this.subscriberRepo.getByChatId(chatId);

        if (existingSubscriber && existingSubscriber.actif) {
          await ctx.answerCallbackQuery({
            text: '✅ Vous êtes déjà abonné !',
            show_alert: false
          });
          logger.info({ chatId }, 'Déjà abonné (callback)');
          return;
        }

        // Créer ou réactiver l'abonnement
        await this.subscriberRepo.update(chatId, {
          nom,
          telephone: null
        });

        // Récupérer le nombre total d'abonnés actifs
        const allActive = await this.subscriberRepo.getAllActive();

        // Répondre au callback
        await ctx.answerCallbackQuery({
          text: '✅ Abonnement confirmé !',
          show_alert: false
        });

        // Envoyer le message de confirmation
        await ctx.reply(botMessages.subscribe.success, {
          parse_mode: 'Markdown'
        });

        logger.info({ chatId, nom }, 'Abonnement créé (callback)');

        // Notifier l'admin
        await this.adminNotifier.notifySubscription(
          'subscribe',
          { nom, username, chatId },
          null,
          allActive.length
        );
      } else {
        // Callback inconnu
        await ctx.answerCallbackQuery({
          text: '❌ Action inconnue',
          show_alert: false
        });
      }

    } catch (error) {
      logger.error({ err: error, chatId, callbackData }, 'Erreur lors du callback');

      await ctx.answerCallbackQuery({
        text: '❌ Une erreur est survenue',
        show_alert: true
      });

      // Notifier l'admin de l'erreur si c'était un subscribe
      if (callbackData === 'subscribe') {
        await this.adminNotifier.notifySubscription(
          'subscribe',
          { nom, username, chatId },
          error,
          0
        );
      }
    }
  }
}
