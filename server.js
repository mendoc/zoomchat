import express from 'express';
import { Bot } from 'grammy';
import { env } from './shared/config/env.js';
import { logger } from './shared/logger.js';
import { BotFactory } from './bot/BotFactory.js';

// Import repositories
import { SubscriberRepository } from './models/SubscriberRepository.js';
import { ParutionRepository } from './models/ParutionRepository.js';
import { AnnonceRepository } from './models/AnnonceRepository.js';
import { EnvoiRepository } from './models/EnvoiRepository.js';
import { ConversationRepository } from './models/ConversationRepository.js';

// Import services
import { PdfService } from './services/extraction/PdfService.js';
import { GeminiService } from './services/extraction/GeminiService.js';
import { ExtractionOrchestrator } from './services/extraction/ExtractionOrchestrator.js';
import { EmbeddingService } from './services/search/EmbeddingService.js';
import { VectorSearchService } from './services/search/VectorSearchService.js';
import { RelevanceFilterService } from './services/search/RelevanceFilterService.js';
import { AdminNotifier } from './services/notification/AdminNotifier.js';
import { MassNotifyService } from './services/notification/MassNotifyService.js';
import { SessionManager } from './shared/SessionManager.js';

// Import routes
import { HealthRoute } from './routes/HealthRoute.js';
import { WebhookRoute } from './routes/WebhookRoute.js';
import { SetWebhookRoute } from './routes/SetWebhookRoute.js';
import { SearchRoute } from './routes/SearchRoute.js';
import { ExtractRoute } from './routes/ExtractRoute.js';
import { ParutionRoute } from './routes/ParutionRoute.js';
import { NotifyRoute } from './routes/NotifyRoute.js';

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
const conversationRepo = new ConversationRepository();

logger.info('Repositories initialisés');

// Initialiser les services
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

const sessionManager = new SessionManager();

logger.info('Services initialisés');

// Créer une instance temporaire du bot pour AdminNotifier
const tempBot = new Bot(env.TELEGRAM_BOT_TOKEN);

// Initialiser les services de notification (nécessitent le bot)
const adminNotifier = new AdminNotifier(tempBot, env.ADMIN_CHAT_ID);
const massNotifyService = new MassNotifyService(tempBot, subscriberRepo, envoiRepo);

logger.info('Services de notification initialisés');

// Initialiser le bot avec toutes les dépendances
const bot = BotFactory.create(env.TELEGRAM_BOT_TOKEN, {
  subscriberRepo,
  parutionRepo,
  vectorSearchService,
  adminNotifier,
  conversationRepo,
  sessionManager,
});

// Mettre à jour adminNotifier et massNotifyService avec le vrai bot
adminNotifier.bot = bot;
massNotifyService.bot = bot;

logger.info('Bot créé');

// Initialiser les routes communes
const healthRoute = new HealthRoute();
const searchRoute = new SearchRoute(vectorSearchService);
const parutionRoute = new ParutionRoute(parutionRepo);
const notifyRoute = new NotifyRoute(parutionRepo, massNotifyService, adminNotifier, bot);
const extractRoute = new ExtractRoute(
  extractionOrchestrator,
  adminNotifier,
  parutionRepo,
  notifyRoute
);

logger.info('Routes communes initialisées');

// Enregistrer les routes communes
app.get('/health', (req, res) => healthRoute.handle(req, res));
app.get('/search', (req, res, next) => searchRoute.handle(req, res, next));
app.post('/parution', (req, res, next) => parutionRoute.handle(req, res, next));
app.post('/extract', (req, res, next) => extractRoute.handle(req, res, next));
app.post('/notify', (req, res, next) => notifyRoute.handle(req, res, next));

logger.info('Routes communes enregistrées');

// Middleware de gestion d'erreurs (doit être en dernier)
app.use(errorMiddleware);

// Démarrage du serveur selon le mode
// En production, forcer le webhook. En développement, respecter USE_WEBHOOK (défaut: false = polling)
const useWebhook = env.NODE_ENV === 'production' ? true : (env.USE_WEBHOOK ?? false);

if (!useWebhook) {
  // Mode polling
  logger.info({ env: env.NODE_ENV }, 'Mode polling détecté');

  // Supprimer le webhook avant de démarrer le polling
  bot.api
    .deleteWebhook()
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
    logger.info({ port }, `Serveur HTTP démarré en mode polling`);
  });
} else {
  // Mode webhook
  logger.info({ env: env.NODE_ENV, forced: env.NODE_ENV === 'production' }, 'Mode webhook détecté');

  // Initialiser les routes spécifiques au webhook
  const webhookRoute = new WebhookRoute(bot);
  const setWebhookRoute = new SetWebhookRoute(bot, env.WEBHOOK_URL);

  // Enregistrer les routes webhook
  app.post('/webhook', (req, res) => webhookRoute.handle(req, res));
  app.get('/setWebhook', (req, res) => setWebhookRoute.handle(req, res));

  logger.info('Routes webhook enregistrées');

  const port = env.PORT || 8080;
  app.listen(port, () => {
    logger.info({ port }, `Serveur démarré en mode webhook`);
    if (env.WEBHOOK_URL) {
      // Base URL du webhook
      const setWebhookUrl = `${env.WEBHOOK_URL.replace('/webhook', '')}/setWebhook`;
      logger.info({ webhookUrl: env.WEBHOOK_URL, setWebhookUrl }, 'Webhook configuré');
    }
  });
}

// Gestion de l'arrêt gracieux
process.on('SIGINT', () => {
  logger.info('SIGINT reçu, arrêt du serveur...');
  sessionManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM reçu, arrêt du serveur...');
  sessionManager.shutdown();
  process.exit(0);
});

export default app;
