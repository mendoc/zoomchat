import 'dotenv/config';
import { env } from '../shared/config/env.js';
import { BotFactory } from '../bot/BotFactory.js';

// Import repositories
import { SubscriberRepository } from '../models/SubscriberRepository.js';
import { ParutionRepository } from '../models/ParutionRepository.js';
import { AnnonceRepository } from '../models/AnnonceRepository.js';

// Import services
import { PdfService } from '../services/extraction/PdfService.js';
import { GeminiService } from '../services/extraction/GeminiService.js';
import { ExtractionOrchestrator } from '../services/extraction/ExtractionOrchestrator.js';
import { EmbeddingService } from '../services/search/EmbeddingService.js';
import { AdminNotifier } from '../services/notification/AdminNotifier.js';
import { VectorSearchService } from '../services/search/VectorSearchService.js';
import { RelevanceFilterService } from '../services/search/RelevanceFilterService.js';
import { NotFoundError } from '../shared/errors.js';

/**
 * Ce script exécute le processus d'extraction de la dernière parution,
 * de la même manière que le endpoint POST /extract.
 *
 * Usage:
 * node scripts/extract.js
 */
async function main() {
  const forceExtract = process.argv.includes('--force');
  console.log(`Début du script d'extraction. ${forceExtract ? '(Forcé)' : ''}`);
  const startTime = new Date();

  try {
    // 1. Initialiser les dépendances (comme dans server.js)
    const subscriberRepo = new SubscriberRepository();
    const parutionRepo = new ParutionRepository();
    const annonceRepo = new AnnonceRepository();

    const pdfService = new PdfService();
    const geminiService = new GeminiService(env.GEMINI_API_KEY);
    const embeddingService = new EmbeddingService(env.GEMINI_API_KEY);
    const relevanceFilterService = new RelevanceFilterService(env.GEMINI_API_KEY);

    const extractionOrchestrator = new ExtractionOrchestrator(
      pdfService,
      geminiService,
      embeddingService,
      annonceRepo,
      parutionRepo
    );

    const vectorSearchService = new VectorSearchService(
      annonceRepo,
      embeddingService,
      relevanceFilterService
    );

    const bot = BotFactory.create(env.TELEGRAM_BOT_TOKEN, {
      subscriberRepo,
      parutionRepo,
      vectorSearchService,
      adminNotifier: null, // Sera initialisé ci-dessous
    });

    const adminNotifier = new AdminNotifier(bot, env.ADMIN_CHAT_ID);

    console.log('Dépendances initialisées.');

    // 2. Récupérer la dernière parution
    const latestParution = await parutionRepo.getLatest();
    if (!latestParution) {
      throw new NotFoundError('Aucune parution trouvée en base de données.');
    }
    const { numero } = latestParution;
    console.log({ numero }, 'Parution la plus récente trouvée.');

    // 3. Lancer l'extraction
    console.log({ numero, forceExtract }, "Lancement de l'extraction...");
    const stats = await extractionOrchestrator.extractParution(numero, { forceExtract });
    console.log({ numero, stats }, 'Extraction terminée avec succès.');

    // 4. Notifier l'administrateur
    await adminNotifier.notifyExtraction(
      {
        numero,
        periode: stats.periode || 'N/A',
        pdfUrl: stats.pdfUrl || 'N/A',
      },
      stats,
      stats.duration
    );
    console.log("Notification envoyée à l'administrateur.");

    // 5. Afficher le résumé
    const endTime = new Date();
    const durationInSeconds = (endTime - startTime) / 1000;

    console.log(
      {
        ...stats,
        totalDuration: `${durationInSeconds.toFixed(2)}s`,
      },
      'Script terminé avec succès.'
    );
  } catch (error) {
    console.error(
      { err: error },
      "Une erreur est survenue pendant l'exécution du script d'extraction."
    );
    process.exit(1); // Terminer avec un code d'erreur
  } finally {
    // Assurer que le script se termine, même si des connexions sont ouvertes
    // (le pool de la DB peut maintenir le processus actif)
    process.exit(0);
  }
}

main();
