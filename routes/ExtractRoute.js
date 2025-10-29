import { logger } from '../shared/logger.js';
import { apiMessages } from '../locales/api-messages.js';
import { ValidationError } from '../shared/errors.js';

/**
 * Route d'extraction d'une parution
 */
export class ExtractRoute {
  /**
   * @param {ExtractionOrchestrator} extractionOrchestrator
   * @param {AdminNotifier} adminNotifier
   */
  constructor(extractionOrchestrator, adminNotifier) {
    this.extractionOrchestrator = extractionOrchestrator;
    this.adminNotifier = adminNotifier;
  }

  /**
   * Gère la route POST /extract
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res, next) {
    try {
      const { numero } = req.body;

      if (!numero) {
        throw new ValidationError('Le paramètre "numero" est requis');
      }

      logger.info({ numero }, 'Extraction demandée');

      // Lancer l'extraction
      const stats = await this.extractionOrchestrator.extractParution(numero);

      logger.info(
        { numero, stats },
        'Extraction terminée'
      );

      // Notifier l'admin
      await this.adminNotifier.notifyExtraction(
        {
          numero,
          periode: stats.periode || 'N/A',
          pdfUrl: stats.pdfUrl || 'N/A'
        },
        stats,
        stats.duration
      );

      res.json({
        success: true,
        message: apiMessages.extraction.success,
        stats
      });

    } catch (error) {
      next(error);
    }
  }
}
