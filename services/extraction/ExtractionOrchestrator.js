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
   * @param {object} options - Options d'extraction
   * @param {boolean} options.forceExtract - Forcer l'extraction même si déjà faite
   * @returns {Promise<object>} Statistiques de l'extraction
   */
  async extractParution(numero, { forceExtract = false } = {}) {
    const startTime = Date.now();
    logger.info({ numero, forceExtract }, 'Début du pipeline d\'extraction');

    try {
      // 1. Récupérer la parution depuis la DB
      const parution = await this.parutionRepo.getByNumero(numero);
      if (!parution) {
        throw new Error(`Parution ${numero} introuvable en base de données`);
      }
      logger.info({ numero, pdfUrl: parution.pdfUrl }, 'Parution trouvée');

      let geminiStats = {};
      let totalExtrait = 0;
      let nombreSansReference = 0;
      let nombreInsereEnBase = 0;

      // 2. Vérifier si l'extraction a déjà eu lieu
      const existingAnnoncesCount = await this.annonceRepo.countByParutionId(parution.id);

      if (existingAnnoncesCount > 0 && !forceExtract) {
        logger.info({ numero, count: existingAnnoncesCount }, 'Extraction déjà effectuée, passage à la génération des embeddings.');
      } else {
        // 3. Extraire les annonces si nécessaire
        logger.info({ numero }, 'Lancement de l\'extraction des annonces (PDF -> Gemini).');

        const pages = await this.pdfService.downloadAndSplit(parution.pdfUrl);
        logger.info({ numero, pagesCount: pages.length }, 'PDF téléchargé et découpé');

        const { annonces, stats } = await this.geminiService.extractAll(pages);
        geminiStats = stats;
        totalExtrait = annonces.length;

        const validAnnonces = annonces.filter(a => a.reference && a.reference.trim() !== '');
        nombreSansReference = totalExtrait - validAnnonces.length;

        logger.info(
          {
            numero,
            totalExtrait,
            nombreSansReference,
            validAnnonces: validAnnonces.length
          },
          'Annonces extraites par Gemini et filtrées'
        );

        if (validAnnonces.length > 0) {
          const annoncesToSave = validAnnonces.map(a => ({
            ...a,
            parutionId: parution.id,
            embedding: null
          }));

          const insertedResult = await this.annonceRepo.bulkCreate(annoncesToSave);
          nombreInsereEnBase = insertedResult.length;

          logger.info({ numero, count: nombreInsereEnBase }, 'Sauvegarde des annonces valides terminée.');
        }
      }

      // 4. Générer les embeddings pour les annonces qui n'en ont pas
      logger.info({ numero }, 'Vérification des annonces nécessitant un embedding');
      const annoncesToEmbed = await this.annonceRepo.findWithoutEmbedding(parution.id);

      let embeddingsGeneratedCount = 0;
      if (annoncesToEmbed.length > 0) {
        logger.info({ numero, count: annoncesToEmbed.length }, 'Génération des embeddings');

        const embeddings = await this.embeddingService.generateBatch(
          annoncesToEmbed,
          (current, total) => {
            if (current % 10 === 0 || current === total) {
              logger.debug({ current, total }, 'Progression génération embeddings');
            }
          }
        );

        const annoncesWithEmbeddings = annoncesToEmbed.map((annonce, i) => ({
          id: annonce.id,
          embedding: embeddings[i]?.embedding || null
        })).filter(a => a.embedding);

        embeddingsGeneratedCount = annoncesWithEmbeddings.length;

        if (embeddingsGeneratedCount > 0) {
          const annoncesToUpdate = annoncesWithEmbeddings.map(a => ({
            ...a,
            embedding: this.embeddingService.embeddingToPostgres(a.embedding)
          }));

          logger.info({ numero, count: embeddingsGeneratedCount }, 'Mise à jour des embeddings en base de données');
          await this.annonceRepo.bulkUpdateEmbeddings(annoncesToUpdate);
        }
      } else {
        logger.info({ numero }, 'Aucune annonce à traiter pour la génération d\'embeddings.');
      }

      // 5. Final Stats
      const duration = Date.now() - startTime;
      const finalAnnoncesCount = await this.annonceRepo.countByParutionId(parution.id);

      const finalStats = {
        numero,
        duration,
        forceExtract,
        totalExtrait,
        nombreSansReference,
        nombreInsereEnBase,
        embeddingsGeneratedCount,
        totalAnnoncesInParution: finalAnnoncesCount,
        periode: parution.periode, // Re-add for notifier
        pdfUrl: parution.pdfUrl,   // Re-add for notifier
        geminiStats: geminiStats || null
      };

      logger.info(finalStats, 'Pipeline d\'extraction terminé');
      return finalStats;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ err: error, numero, duration }, 'Erreur majeure dans le pipeline d\'extraction');
      throw error;
    }
  }
}
