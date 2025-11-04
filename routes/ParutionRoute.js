import { logger } from '../shared/logger.js';
import { ValidationError } from '../shared/errors.js';

/**
 * Route d'enregistrement d'une nouvelle parution
 */
export class ParutionRoute {
  /**
   * @param {ParutionRepository} parutionRepository
   */
  constructor(parutionRepository) {
    this.parutionRepository = parutionRepository;
  }

  /**
   * Gère la route POST /parution
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   * @param {Function} next - Fonction next d'Express
   */
  async handle(req, res, next) {
    try {
      const { numero, periode, pdfUrl, dateParution } = req.body;

      // Validation des champs requis
      if (!numero || !periode || !pdfUrl) {
        throw new ValidationError('Les champs numero, periode et pdfUrl sont requis');
      }

      // dateParution doit être fourni par Apps Script (date de réception email)
      // Si non fourni, on utilise la date actuelle
      const parutionDate = dateParution ? new Date(dateParution) : new Date();

      logger.info(
        { numero, periode, pdfUrl, dateParution: parutionDate },
        'Enregistrement de la parution'
      );

      // Créer ou mettre à jour la parution
      const parution = await this.parutionRepository.create({
        numero,
        periode,
        pdfUrl,
        dateParution: parutionDate,
        telegramFileId: null, // Sera rempli après upload du PDF
      });

      logger.info({ parutionId: parution.id, numero }, 'Parution enregistrée avec succès');

      res.status(201).json({
        success: true,
        message: 'Parution enregistrée avec succès',
        parution: {
          id: parution.id,
          numero: parution.numero,
          periode: parution.periode,
          pdfUrl: parution.pdfUrl,
          dateParution: parution.dateParution,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
