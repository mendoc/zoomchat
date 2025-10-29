import { apiMessages } from '../locales/api-messages.js';

/**
 * Route de health check
 */
export class HealthRoute {
  /**
   * Gère la route GET /health
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res) {
    res.json(apiMessages.health.ok);
  }
}
