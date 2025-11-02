import { webhookCallback } from 'grammy';
import { logger } from '../shared/logger.js';

/**
 * Route pour le webhook Telegram
 */
export class WebhookRoute {
  /**
   * @param {Bot} bot - Instance du bot grammy
   */
  constructor(bot) {
    this.bot = bot;
    this.handler = webhookCallback(bot, 'express');
  }

  /**
   * Gère la route POST /webhook
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  handle(req, res) {
    try {
      res.sendStatus(200);
      this.handler(req, res);
    } catch (error) {
      logger.error({ err: error }, 'Erreur dans le webhook');
      res.status(500).send('Internal Server Error');
    }
  }
}
