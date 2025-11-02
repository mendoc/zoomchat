import { adminMessages } from '../../locales/admin-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Service pour envoyer des notifications à l'administrateur
 */
export class AdminNotifier {
  /**
   * @param {Bot} bot - Instance grammy du bot Telegram
   * @param {string} adminChatId - Chat ID de l'administrateur
   */
  constructor(bot, adminChatId) {
    this.bot = bot;
    this.adminChatId = adminChatId;
  }

  /**
   * Notifie l'admin d'un événement d'abonnement/désabonnement
   * @param {string} action - 'subscribe' ou 'unsubscribe'
   * @param {object} userData - Données de l'utilisateur
   * @param {string} userData.nom - Nom de l'utilisateur
   * @param {string} userData.username - Username Telegram (optionnel)
   * @param {number} userData.chatId - Chat ID Telegram
   * @param {Error} error - Erreur éventuelle (optionnel)
   * @param {number} totalActifs - Nombre total d'abonnés actifs
   */
  async notifySubscription(action, userData, error = null, totalActifs = 0) {
    if (!this.adminChatId) {
      logger.debug('ADMIN_CHAT_ID non configuré - notification admin ignorée');
      return;
    }

    try {
      const status = error ? 'error' : 'success';
      const now = new Date().toLocaleString('fr-FR', {
        timeZone: 'Africa/Libreville',
      });

      let message = adminMessages.subscription.title(action, status);
      message += adminMessages.subscription.userInfo(
        userData.nom,
        userData.username,
        userData.chatId,
        now
      );

      if (error) {
        message += adminMessages.subscription.error(error.message);
      }

      message += adminMessages.subscription.stats(totalActifs);

      await this.bot.api.sendMessage(this.adminChatId, message, { parse_mode: 'Markdown' });

      logger.info(
        { action, status, chatId: userData.chatId },
        'Notification admin envoyée pour abonnement'
      );
    } catch (error) {
      logger.error(
        { err: error, action, userData },
        "Erreur lors de l'envoi de la notification admin"
      );
    }
  }

  /**
   * Notifie l'admin de la fin d'une extraction
   * @param {object} parutionInfo - Informations de la parution
   * @param {string} parutionInfo.numero - Numéro de la parution
   * @param {string} parutionInfo.periode - Période de la parution
   * @param {string} parutionInfo.pdfUrl - URL du PDF
   * @param {object} stats - Statistiques de l'extraction
   * @param {number} duration - Durée en millisecondes
   */
  async notifyExtraction(parutionInfo, stats, duration) {
    if (!this.adminChatId) {
      logger.debug('ADMIN_CHAT_ID non configuré - notification admin ignorée');
      return;
    }

    try {
      const durationSec = (duration / 1000).toFixed(1);

      // Déterminer le statut
      let status = 'success';
      // Échec complet uniquement si :
      // - Aucune annonce extraite ET des pages ont été traitées
      // - OU toutes les pages traitées ont échoué (et au moins une page traitée)
      if (
        (stats.annoncesExtracted === 0 && stats.totalPages > 0) ||
        (stats.pagesErrors === stats.totalPages && stats.totalPages > 0)
      ) {
        status = 'complete_failure';
      } else if (stats.pagesErrors > 0) {
        status = 'partial_success';
      }

      let message = adminMessages.extraction.title(status);
      message += adminMessages.extraction.parutionInfo(
        parutionInfo.numero,
        parutionInfo.periode,
        parutionInfo.pdfUrl
      );

      message += adminMessages.extraction.extractionStats(
        stats.totalPages,
        stats.pagesSuccess,
        stats.pagesErrors,
        durationSec
      );

      message += adminMessages.extraction.saveStats(
        stats.annoncesExtracted || 0,
        stats.annoncesSaved || 0,
        stats.annoncesWithoutRef || 0
      );

      message += adminMessages.extraction.embeddingStats(
        stats.totalAnnonces,
        stats.embeddingsGenerated || 0
      );

      // Calculer les catégories
      if (stats.geminiStats && stats.geminiStats.pageDetails) {
        const _categories = {};
        // On pourrait calculer les catégories ici si on a les données
        // Pour l'instant on skip cette partie
      }

      message += adminMessages.extraction.footer;

      await this.bot.api.sendMessage(this.adminChatId, message, { parse_mode: 'Markdown' });

      logger.info(
        { numero: parutionInfo.numero, status },
        'Notification admin envoyée pour extraction'
      );
    } catch (error) {
      logger.error(
        { err: error, parutionInfo },
        "Erreur lors de l'envoi de la notification admin d'extraction"
      );
    }
  }
}
