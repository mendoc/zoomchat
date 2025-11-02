import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Commande /abonner - S'abonner aux notifications
 */
export class AbonnerCommand {
  /**
   * @param {SubscriberRepository} subscriberRepo
   * @param {AdminNotifier} adminNotifier
   */
  constructor(subscriberRepo, adminNotifier) {
    this.subscriberRepo = subscriberRepo;
    this.adminNotifier = adminNotifier;
  }

  /**
   * Gère la commande /abonner
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const chatId = ctx.chat.id;
    const nom = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
    const username = ctx.from.username;

    try {
      logger.info({ chatId, nom }, 'Commande /abonner reçue');

      // Vérifier si déjà abonné
      const existingSubscriber = await this.subscriberRepo.getByChatId(chatId);

      if (existingSubscriber && existingSubscriber.actif) {
        const date = new Date(existingSubscriber.dateAbonnement).toLocaleDateString('fr-FR');
        await ctx.reply(botMessages.subscribe.alreadySubscribed(date), {
          parse_mode: 'Markdown',
        });
        logger.info({ chatId }, 'Déjà abonné');
        return;
      }

      // Créer ou réactiver l'abonnement
      await this.subscriberRepo.update(chatId, {
        nom,
        telephone: null, // Le téléphone sera ajouté si nécessaire
      });

      // Récupérer le nombre total d'abonnés actifs
      const allActive = await this.subscriberRepo.getAllActive();

      // Envoyer le message de confirmation
      await ctx.reply(botMessages.subscribe.success, {
        parse_mode: 'Markdown',
      });

      logger.info({ chatId, nom }, 'Abonnement créé/réactivé');

      // Notifier l'admin
      await this.adminNotifier.notifySubscription(
        'subscribe',
        { nom, username, chatId },
        null,
        allActive.length
      );
    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de /abonner');
      await ctx.reply(botMessages.subscribe.error);

      // Notifier l'admin de l'erreur
      await this.adminNotifier.notifySubscription('subscribe', { nom, username, chatId }, error, 0);
    }
  }
}
