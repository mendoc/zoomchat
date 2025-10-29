import express from 'express';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger.js';
import { BotFactory } from './bot/BotFactory.js';

// Import repositories
import { SubscriberRepository } from './models/SubscriberRepository.js';
import { ParutionRepository } from './models/ParutionRepository.js';
import { AnnonceRepository } from './models/AnnonceRepository.js';
import { EnvoiRepository } from './models/EnvoiRepository.js';

// Import services
import { PdfService } from './services/extraction/PdfService.js';
import { GeminiService } from './services/extraction/GeminiService.js';
import { ExtractionOrchestrator } from './services/extraction/ExtractionOrchestrator.js';
import { EmbeddingService } from './services/search/EmbeddingService.js';
import { HybridSearchService } from './services/search/HybridSearchService.js';
import { AdminNotifier } from './services/notification/AdminNotifier.js';
import { MassNotifyService } from './services/notification/MassNotifyService.js';

// Import routes
import { HealthRoute } from './routes/HealthRoute.js';
import { WebhookRoute } from './routes/WebhookRoute.js';
import { SetWebhookRoute } from './routes/SetWebhookRoute.js';
import { SearchRoute } from './routes/SearchRoute.js';
import { ExtractRoute } from './routes/ExtractRoute.js';

// Import middleware
import { loggerMiddleware } from './middleware/LoggerMiddleware.js';
import { errorMiddleware } from './middleware/ErrorMiddleware.js';

// Créer l'application Express
const app = express();

// Middleware de base
app.use(express.json());
app.use(loggerMiddleware);

// Initialiser les repositories
const subscriberRepo = new SubscriberRepository();
const parutionRepo = new ParutionRepository();
const annonceRepo = new AnnonceRepository();
const envoiRepo = new EnvoiRepository();

logger.info('Repositories initialisés');

// Initialiser les services
const pdfService = new PdfService();
const geminiService = new GeminiService(env.GEMINI_API_KEY);
const embeddingService = new EmbeddingService(env.GEMINI_API_KEY);

const extractionOrchestrator = new ExtractionOrchestrator(
  pdfService,
  geminiService,
  embeddingService,
  annonceRepo,
  parutionRepo
);

const hybridSearchService = new HybridSearchService(
  annonceRepo,
  embeddingService
);

logger.info('Services initialisés');

// Initialiser le bot
const bot = BotFactory.create(env.TELEGRAM_BOT_TOKEN, {
  subscriberRepo,
  parutionRepo,
  hybridSearchService,
  adminNotifier: null // Sera initialisé ci-dessous
});

logger.info('Bot créé');

// Initialiser les services de notification (nécessitent le bot)
const adminNotifier = new AdminNotifier(bot, env.ADMIN_CHAT_ID);
const massNotifyService = new MassNotifyService(bot, subscriberRepo, envoiRepo);

logger.info('Services de notification initialisés');

// Initialiser les routes communes
const healthRoute = new HealthRoute();
const searchRoute = new SearchRoute(hybridSearchService);
const extractRoute = new ExtractRoute(extractionOrchestrator, adminNotifier);

logger.info('Routes communes initialisées');

// Enregistrer les routes communes
app.get('/health', (req, res) => healthRoute.handle(req, res));
app.get('/search', (req, res, next) => searchRoute.handle(req, res, next));
app.post('/extract', (req, res, next) => extractRoute.handle(req, res, next));

logger.info('Routes communes enregistrées');

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorMiddleware);

// Démarrage du serveur selon le mode
if (env.NODE_ENV === 'development') {
  // Mode développement: polling
  logger.info('Mode développement détecté');

  // Supprimer le webhook avant de démarrer le polling
  bot.api.deleteWebhook()
    .then(() => {
      logger.info('Webhook supprimé');
      bot.start();
      logger.info('Bot démarré en mode polling');
    })
    .catch((error) => {
      logger.error({ err: error }, 'Erreur lors de la suppression du webhook');
    });

  // Démarrer quand même le serveur HTTP pour les routes /search, /extract, etc.
  const port = env.PORT || 8080;
  app.listen(port, () => {
    logger.info({ port }, `Serveur HTTP démarré en mode développement`);
  });

} else {
  // Mode production: webhook
  logger.info('Mode production détecté');

  // Initialiser les routes spécifiques au webhook
  const webhookRoute = new WebhookRoute(bot);
  const setWebhookRoute = new SetWebhookRoute(bot, env.WEBHOOK_URL);

  // Enregistrer les routes webhook
  app.post('/webhook', (req, res) => webhookRoute.handle(req, res));
  app.get('/setWebhook', (req, res) => setWebhookRoute.handle(req, res));

  logger.info('Routes webhook enregistrées');

  const port = env.PORT || 8080;
  app.listen(port, () => {
    logger.info({ port }, `Serveur démarré en mode production (webhook)`);
    logger.info({ webhookUrl: env.WEBHOOK_URL }, 'Webhook configuré');
  });
}

// Gestion de l'arrêt gracieux
process.on('SIGINT', () => {
  logger.info('SIGINT reçu, arrêt du serveur...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt du serveur...');
  process.exit(0);
});

export default app;
