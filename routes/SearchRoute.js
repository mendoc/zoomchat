import { logger } from '../shared/logger.js';
import { ValidationError } from '../shared/errors.js';

/**
 * Route de recherche d'annonces
 */
export class SearchRoute {
  /**
   * @param {VectorSearchService} vectorSearchService
   */
  constructor(vectorSearchService) {
    this.vectorSearchService = vectorSearchService;
  }

  /**
   * Gère la route GET /search?query=...
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res, next) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string') {
        throw new ValidationError('Le paramètre "query" est requis');
      }

      logger.info({ query }, 'Recherche HTTP reçue');

      // Effectuer la recherche
      const results = await this.vectorSearchService.search(query);

      logger.info({ query, resultsCount: results.length }, 'Résultats de recherche HTTP');

      res.json({
        success: true,
        query,
        count: results.length,
        results,
      });
    } catch (error) {
      next(error);
    }
  }
}
