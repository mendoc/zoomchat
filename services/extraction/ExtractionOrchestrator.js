import { logger } from '../../shared/logger.js';

/**
 * Orchestrateur du pipeline complet d'extraction d'annonces
 * Coordonne PdfService, GeminiService, EmbeddingService et les repositories
 */
export class ExtractionOrchestrator {
  /**
   * @param {PdfService} pdfService
   * @param {GeminiService} geminiService
   * @param {EmbeddingService} embeddingService
   * @param {AnnonceRepository} annonceRepo
   * @param {ParutionRepository} parutionRepo
   */
  constructor(
    pdfService,
    geminiService,
    embeddingService,
    annonceRepo,
    parutionRepo
  ) {
    this.pdfService = pdfService;
    this.geminiService = geminiService;
    this.embeddingService = embeddingService;
    this.annonceRepo = annonceRepo;
    this.parutionRepo = parutionRepo;
  }

  /**
   * Pipeline complet d'extraction d'une parution
   * @param {string} numero - Numéro de la parution
   * @returns {Promise<object>} Statistiques de l'extraction
   */
  async extractParution(numero) {
    const startTime = Date.now();

    logger.info({ numero }, 'Début de l\'extraction de la parution');

    try {
      // 1. Récupérer la parution depuis la DB
      const parution = await this.parutionRepo.getByNumero(numero);

      if (!parution) {
        throw new Error(`Parution ${numero} introuvable en base de données`);
      }

      logger.info(
        { numero, pdfUrl: parution.pdfUrl },
        'Parution trouvée'
      );

      // 2. Télécharger et splitter le PDF
      logger.info({ numero }, 'Téléchargement et découpage du PDF');
      const pages = await this.pdfService.downloadAndSplit(parution.pdfUrl);

      logger.info(
        { numero, pagesCount: pages.length },
        'PDF téléchargé et découpé'
      );

      // 3. Extraire les annonces avec Gemini
      logger.info({ numero }, 'Extraction des annonces avec Gemini');
      const { annonces, stats: geminiStats } = await this.geminiService.extractAll(pages);

      logger.info(
        { numero, annoncesCount: annonces.length },
        'Annonces extraites par Gemini'
      );

      // 4. Générer les embeddings pour chaque annonce
      logger.info({ numero }, 'Génération des embeddings');
      const annoncesWithParutionId = annonces.map(a => ({
        ...a,
        parutionId: parution.id
      }));

      const embeddings = await this.embeddingService.generateBatch(
        annoncesWithParutionId,
        (current, total) => {
          if (current % 10 === 0 || current === total) {
            logger.debug(
              { current, total },
              'Progression génération embeddings'
            );
          }
        }
      );

      // 5. Combiner annonces avec embeddings
      const annoncesWithEmbeddings = annoncesWithParutionId.map((annonce, i) => ({
        ...annonce,
        embedding: embeddings[i]?.embedding || null
      }));

      logger.info(
        {
          numero,
          totalAnnonces: annoncesWithEmbeddings.length,
          withEmbeddings: annoncesWithEmbeddings.filter(a => a.embedding !== null).length
        },
        'Embeddings générés'
      );

      // 6. Sauvegarder les annonces en base
      logger.info({ numero }, 'Sauvegarde des annonces en base');
      await this.annonceRepo.bulkCreate(annoncesWithEmbeddings);

      const duration = Date.now() - startTime;

      const finalStats = {
        numero,
        duration,
        pagesProcessed: geminiStats.pagesSuccess,
        pagesErrors: geminiStats.pagesErrors,
        totalAnnonces: annonces.length,
        annoncesWithEmbeddings: annoncesWithEmbeddings.filter(a => a.embedding !== null).length,
        annoncesWithoutEmbeddings: annoncesWithEmbeddings.filter(a => a.embedding === null).length,
        geminiStats
      };

      logger.info(finalStats, 'Extraction de la parution terminée');

      return finalStats;

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(
        { err: error, numero, duration },
        'Erreur lors de l\'extraction de la parution'
      );

      throw error;
    }
  }
}
