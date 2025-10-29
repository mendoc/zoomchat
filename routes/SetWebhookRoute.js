import { logger } from '../shared/logger.js';
import { apiMessages } from '../locales/api-messages.js';

/**
 * Route pour configurer le webhook Telegram
 */
export class SetWebhookRoute {
  /**
   * @param {Bot} bot - Instance du bot grammy
   * @param {string} webhookUrl - URL du webhook
   */
  constructor(bot, webhookUrl) {
    this.bot = bot;
    this.webhookUrl = webhookUrl;
  }

  /**
   * Gère la route GET /setWebhook
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res) {
    try {
      logger.info({ webhookUrl: this.webhookUrl }, 'Configuration du webhook');

      await this.bot.api.setWebhook(this.webhookUrl);

      logger.info('Webhook configuré avec succès');

      res.json({
        success: true,
        message: apiMessages.webhook.set,
        webhookUrl: this.webhookUrl
      });

    } catch (error) {
      logger.error({ err: error }, 'Erreur lors de la configuration du webhook');

      res.status(500).json({
        success: false,
        error: apiMessages.webhook.error
      });
    }
  }
}
