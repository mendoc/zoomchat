import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Commande /desabonner - Se désabonner des notifications
 */
export class DesabonnerCommand {
  /**
   * @param {SubscriberRepository} subscriberRepo
   * @param {AdminNotifier} adminNotifier
   */
  constructor(subscriberRepo, adminNotifier) {
    this.subscriberRepo = subscriberRepo;
    this.adminNotifier = adminNotifier;
  }

  /**
   * Gère la commande /desabonner
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const chatId = ctx.chat.id;
    const nom = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
    const username = ctx.from.username;

    try {
      logger.info({ chatId, nom }, 'Commande /desabonner reçue');

      // Vérifier si abonné
      const subscriber = await this.subscriberRepo.getByChatId(chatId);

      if (!subscriber || !subscriber.actif) {
        await ctx.reply(botMessages.unsubscribe.notSubscribed);
        logger.info({ chatId }, 'Utilisateur non abonné');
        return;
      }

      // Désactiver l'abonnement
      await this.subscriberRepo.deactivate(chatId);

      // Récupérer le nombre total d'abonnés actifs
      const allActive = await this.subscriberRepo.getAllActive();

      // Envoyer le message de confirmation
      await ctx.reply(botMessages.unsubscribe.success, {
        parse_mode: 'Markdown'
      });

      logger.info({ chatId, nom }, 'Désabonnement effectué');

      // Notifier l'admin
      await this.adminNotifier.notifySubscription(
        'unsubscribe',
        { nom, username, chatId },
        null,
        allActive.length
      );

    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de /desabonner');
      await ctx.reply(botMessages.unsubscribe.error);

      // Notifier l'admin de l'erreur
      await this.adminNotifier.notifySubscription(
        'unsubscribe',
        { nom, username, chatId },
        error,
        0
      );
    }
  }
}
