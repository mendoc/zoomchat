import { logger } from '../shared/logger.js';
import { apiMessages } from '../locales/api-messages.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

/**
 * Route d'extraction d'une parution
 */
export class ExtractRoute {
  /**
   * @param {ExtractionOrchestrator} extractionOrchestrator
   * @param {AdminNotifier} adminNotifier
   * @param {ParutionRepository} parutionRepository
   */
  constructor(extractionOrchestrator, adminNotifier, parutionRepository) {
    this.extractionOrchestrator = extractionOrchestrator;
    this.adminNotifier = adminNotifier;
    this.parutionRepository = parutionRepository;
  }

  /**
   * Gère la route POST /extract
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res, next) {
    try {
      const forceExtract = req.body?.forceExtract || false;

      const latestParution = await this.parutionRepository.getLatest();

      if (!latestParution) {
        throw new NotFoundError('Aucune parution trouvée');
      }
      const { numero } = latestParution;

      logger.info({ numero, forceExtract }, 'Extraction demandée');

      // Lancer l'extraction
      const stats = await this.extractionOrchestrator.extractParution(numero, { forceExtract });

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
