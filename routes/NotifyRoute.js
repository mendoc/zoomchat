import { URL } from 'node:url';
import { InputFile } from 'grammy';
import { logger } from '../shared/logger.js';
import { NotFoundError, BadRequestError } from '../shared/errors.js';

/**
 * Route pour déclencher l'envoi massif d'une parution aux abonnés
 */
export class NotifyRoute {
  /**
   * @param {ParutionRepository} parutionRepository
   * @param {MassNotifyService} massNotifyService
   * @param {AdminNotifier} adminNotifier
   * @param {Bot} bot - Instance grammy pour uploader le PDF
   */
  constructor(parutionRepository, massNotifyService, adminNotifier, bot) {
    this.parutionRepository = parutionRepository;
    this.massNotifyService = massNotifyService;
    this.adminNotifier = adminNotifier;
    this.bot = bot;
  }

  /**
   * Gère la route POST /notify
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   * @param {Function} next - Fonction next d'Express
   */
  async handle(req, res, next) {
    try {
      const { numero } = req.body;

      if (!numero) {
        throw new BadRequestError('Le champ numero est requis');
      }

      logger.info({ numero }, "Démarrage de l'envoi massif");

      // 1. Récupérer la parution
      const parution = await this.parutionRepository.getByNumero(numero);

      if (!parution) {
        throw new NotFoundError(`Parution ${numero} non trouvée`);
      }

      // 2. Si pas de telegram_file_id, uploader le PDF à Telegram
      if (!parution.telegramFileId) {
        logger.info({ numero, pdfUrl: parution.pdfUrl }, 'Upload du PDF à Telegram');

        try {
          // Télécharger le PDF depuis l'URL et l'uploader à Telegram
          const inputFile = new InputFile(new URL(parution.pdfUrl));

          // Envoyer le PDF à l'admin pour obtenir le file_id
          // (Telegram donne le file_id après l'upload)
          const message = await this.bot.api.sendDocument(process.env.ADMIN_CHAT_ID, inputFile, {
            caption: `📤 Upload du PDF N°${numero} pour envoi massif`,
          });

          const telegramFileId = message.document.file_id;

          // Mettre à jour la parution avec le file_id
          await this.parutionRepository.updateTelegramFileId(numero, telegramFileId);

          parution.telegramFileId = telegramFileId;

          logger.info({ numero, telegramFileId }, 'PDF uploadé à Telegram');
        } catch (error) {
          logger.error({ err: error, numero }, "Erreur lors de l'upload du PDF");

          // Notifier l'admin de l'échec
          await this.adminNotifier.notifyMassNotificationFailure(
            {
              numero: parution.numero,
              periode: parution.periode,
              pdfUrl: parution.pdfUrl,
            },
            error
          );

          throw error;
        }
      }

      // 3. Envoyer à tous les abonnés
      const stats = await this.massNotifyService.notifyAllSubscribers(parution);

      logger.info(
        {
          numero,
          total: stats.total,
          success: stats.success,
          failed: stats.failed,
        },
        'Envoi massif terminé'
      );

      // 4. Notifier l'admin du succès
      await this.adminNotifier.notifyMassNotificationSuccess(
        {
          numero: parution.numero,
          periode: parution.periode,
          pdfUrl: parution.pdfUrl,
        },
        stats
      );

      res.json({
        success: true,
        message: 'Envoi massif terminé avec succès',
        numero,
        stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
