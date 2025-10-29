import { logger } from '../../shared/logger.js';
import { NOTIFICATION_CONFIG } from '../../shared/config/constants.js';

/**
 * Service pour l'envoi en masse de notifications aux abonnés
 */
export class MassNotifyService {
  /**
   * @param {Bot} bot - Instance grammy du bot Telegram
   * @param {SubscriberRepository} subscriberRepo
   * @param {EnvoiRepository} envoiRepo
   */
  constructor(bot, subscriberRepo, envoiRepo) {
    this.bot = bot;
    this.subscriberRepo = subscriberRepo;
    this.envoiRepo = envoiRepo;
  }

  /**
   * Envoie une parution à tous les abonnés actifs
   * @param {object} parution - Données de la parution
   * @param {number} parution.id - ID de la parution
   * @param {string} parution.numero - Numéro de la parution
   * @param {string} parution.periode - Période de la parution
   * @param {string} parution.telegramFileId - File ID Telegram du PDF
   * @param {string} caption - Légende du document (optionnel)
   * @returns {Promise<object>} Statistiques d'envoi
   */
  async notifyAllSubscribers(parution, caption = null) {
    logger.info(
      { parutionId: parution.id, numero: parution.numero },
      'Début d\'envoi en masse'
    );

    try {
      // 1. Récupérer tous les abonnés actifs
      const subscribers = await this.subscriberRepo.getAllActive();

      if (subscribers.length === 0) {
        logger.warn('Aucun abonné actif trouvé');
        return {
          total: 0,
          success: 0,
          failed: 0,
          subscribers: []
        };
      }

      logger.info(
        { count: subscribers.length },
        'Abonnés actifs récupérés'
      );

      // 2. Préparer la légende
      const finalCaption = caption || this.buildCaption(parution);

      // 3. Envoyer à chaque abonné
      const results = {
        total: subscribers.length,
        success: 0,
        failed: 0,
        subscribers: []
      };

      for (const subscriber of subscribers) {
        try {
          await this.bot.api.sendDocument(
            subscriber.chatId,
            parution.telegramFileId,
            {
              caption: finalCaption,
              parse_mode: 'Markdown'
            }
          );

          // Enregistrer l'envoi réussi
          await this.envoiRepo.create({
            parutionId: parution.id,
            subscriberId: subscriber.id,
            statut: 'success',
            errorMessage: null
          });

          results.success++;
          results.subscribers.push({
            chatId: subscriber.chatId,
            nom: subscriber.nom,
            status: 'success'
          });

          logger.debug(
            { chatId: subscriber.chatId, nom: subscriber.nom },
            'Envoi réussi'
          );

        } catch (error) {
          // Enregistrer l'envoi échoué
          await this.envoiRepo.create({
            parutionId: parution.id,
            subscriberId: subscriber.id,
            statut: 'failed',
            errorMessage: error.message
          });

          results.failed++;
          results.subscribers.push({
            chatId: subscriber.chatId,
            nom: subscriber.nom,
            status: 'failed',
            error: error.message
          });

          logger.error(
            { err: error, chatId: subscriber.chatId, nom: subscriber.nom },
            'Échec d\'envoi'
          );
        }

        // Pause pour respecter le rate limit Telegram (20 msg/sec max)
        if (results.total > 1) {
          await new Promise(resolve =>
            setTimeout(resolve, NOTIFICATION_CONFIG.DELAY_BETWEEN_SENDS)
          );
        }
      }

      logger.info(
        {
          parutionId: parution.id,
          total: results.total,
          success: results.success,
          failed: results.failed
        },
        'Envoi en masse terminé'
      );

      return results;

    } catch (error) {
      logger.error(
        { err: error, parutionId: parution.id },
        'Erreur lors de l\'envoi en masse'
      );
      throw error;
    }
  }

  /**
   * Construit la légende pour le document PDF
   * @param {object} parution - Données de la parution
   * @returns {string} Légende formatée
   */
  buildCaption(parution) {
    let caption = `📰 *Zoom Hebdo N°${parution.numero}*\n\n`;
    caption += `📅 Période : ${parution.periode}\n\n`;
    caption += `Bonne lecture ! 📖`;

    // Tronquer si trop long
    if (caption.length > NOTIFICATION_CONFIG.MAX_CAPTION_LENGTH) {
      caption = caption.substring(0, NOTIFICATION_CONFIG.MAX_CAPTION_LENGTH - 3) + '...';
    }

    return caption;
  }
}
