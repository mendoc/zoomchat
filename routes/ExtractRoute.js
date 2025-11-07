import { logger } from '../shared/logger.js';
import { NotFoundError, ValidationError } from '../shared/errors.js';

/**
 * Route d'extraction d'une parution
 */
export class ExtractRoute {
  /**
   * @param {ExtractionOrchestrator} extractionOrchestrator
   * @param {AdminNotifier} adminNotifier
   * @param {ParutionRepository} parutionRepository
   * @param {NotifyRoute} notifyRoute - Route pour déclencher l'envoi massif après extraction
   */
  constructor(extractionOrchestrator, adminNotifier, parutionRepository, notifyRoute) {
    this.extractionOrchestrator = extractionOrchestrator;
    this.adminNotifier = adminNotifier;
    this.parutionRepository = parutionRepository;
    this.notifyRoute = notifyRoute;
  }

  /**
   * Gère la route POST /extract
   * @param {Request} req - Requête Express
   * @param {Response} res - Réponse Express
   */
  async handle(req, res, next) {
    try {
      const { numero, forceExtract = false } = req.body;

      // Validation : numero est obligatoire
      if (!numero) {
        throw new ValidationError('Le champ numero est requis');
      }

      // Vérifier que la parution existe
      const parution = await this.parutionRepository.getByNumero(numero);
      if (!parution) {
        throw new NotFoundError(`Parution ${numero} non trouvée`);
      }

      logger.info({ numero, forceExtract }, 'Extraction demandée');

      // Répondre immédiatement (202 Accepted) - Apps Script ne sera pas bloqué
      res.status(202).json({
        success: true,
        message: 'Extraction lancée en arrière-plan',
        numero,
      });

      // Lancer l'extraction en arrière-plan (sans await)
      this.extractionOrchestrator
        .extractParution(numero, { forceExtract })
        .then(async (stats) => {
          logger.info({ numero, stats }, 'Extraction terminée');

          const parutionInfo = {
            numero,
            periode: stats.periode || 'N/A',
            pdfUrl: stats.pdfUrl || 'N/A',
          };

          // Mapper les stats pour la notification admin
          const notificationStats = {
            totalPages: stats.geminiStats?.totalPages || 0,
            pagesSuccess: stats.geminiStats?.pagesSuccess || 0,
            pagesErrors: stats.geminiStats?.pagesErrors || 0,
            totalAnnonces: stats.totalAnnoncesInParution || 0,
            annoncesExtracted: stats.totalExtrait || 0,
            annoncesSaved: stats.nombreInsereEnBase || 0,
            annoncesWithoutRef: stats.nombreSansReference || 0,
            embeddingsGenerated: stats.embeddingsGeneratedCount || 0,
            geminiStats: stats.geminiStats,
          };

          // Vérifier s'il y a eu des erreurs d'extraction (échec complet ou partiel)
          // Erreur si : pages avec erreurs OU (pages traitées mais rien extrait)
          // PAS d'erreur si : extraction déjà faite (totalPages === 0, skip)
          const hasErrors =
            stats.geminiStats?.pagesErrors > 0 ||
            (stats.geminiStats?.totalPages > 0 && stats.totalExtrait === 0);

          if (hasErrors) {
            // Notifier l'admin de l'échec/erreur partielle
            await this.adminNotifier.notifyExtractionFailure(
              parutionInfo,
              notificationStats,
              null, // Pas d'exception, juste des erreurs dans le processus
              stats.duration
            );
          } else {
            // Vérifier si une action a été effectuée (extraction ou embeddings)
            const wasAlreadyExtracted =
              stats.geminiStats?.totalPages === 0 && stats.embeddingsGeneratedCount === 0;

            if (!wasAlreadyExtracted) {
              // Notifier l'admin seulement si quelque chose a été fait
              await this.adminNotifier.notifyExtraction(
                parutionInfo,
                notificationStats,
                stats.duration
              );
            } else {
              logger.info(
                { numero },
                'Extraction déjà effectuée, aucune action nécessaire (pas de notification admin)'
              );
            }

            // Déclencher l'envoi massif du PDF aux abonnés
            logger.info({ numero }, "Déclenchement de l'envoi massif après extraction réussie");

            try {
              // Créer un mock de req/res pour appeler notifyRoute
              const mockReq = { body: { numero } };
              const mockRes = {
                json: () => {},
                status: () => mockRes,
              };
              const mockNext = (error) => {
                if (error) {
                  throw error;
                }
              };

              await this.notifyRoute.handle(mockReq, mockRes, mockNext);
            } catch (notifyError) {
              logger.error(
                { err: notifyError, numero },
                "Erreur lors de l'envoi massif après extraction"
              );
              // On ne fait pas échouer la requête, l'extraction a réussi
            }
          }

          logger.info({ numero }, 'Traitement complet terminé en arrière-plan');
        })
        .catch(async (error) => {
          // Gérer les erreurs d'extraction en arrière-plan
          logger.error({ err: error, numero }, "Erreur lors de l'extraction en arrière-plan");

          // Notifier l'admin de l'échec critique
          try {
            await this.adminNotifier.notifyExtractionFailure(
              {
                numero,
                periode: 'N/A',
                pdfUrl: 'N/A',
              },
              null,
              error,
              0
            );
          } catch (notifyError) {
            logger.error({ err: notifyError }, "Erreur lors de la notification d'échec");
          }
        });
    } catch (error) {
      // Notifier l'admin de l'échec critique
      try {
        const numero = req.body?.numero || 'inconnu';
        await this.adminNotifier.notifyExtractionFailure(
          {
            numero,
            periode: 'N/A',
            pdfUrl: 'N/A',
          },
          null,
          error,
          0
        );
      } catch (notifyError) {
        logger.error({ err: notifyError }, "Erreur lors de la notification d'échec");
      }

      next(error);
    }
  }
}
