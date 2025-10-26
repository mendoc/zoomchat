import 'dotenv/config';
import http from 'http';
import { webhookCallback } from 'grammy';
import { createBot } from './bot.js';
import { initDatabase } from './database.js';

// Créer l'instance du bot
const bot = createBot(process.env.TELEGRAM_BOT_TOKEN);

// Initialiser la base de données au démarrage
let dbInitialized = false;

/**
 * Point d'entrée pour Google Cloud Functions
 * Gère les requêtes HTTP webhook de Telegram
 */
export const telegramWebhook = async (req, res) => {
  try {
    // Initialiser la base de données une seule fois
    if (!dbInitialized) {
      await initDatabase();
      dbInitialized = true;
    }

    // Créer le callback webhook pour grammy
    const handleUpdate = webhookCallback(bot, 'std-http');

    // Traiter la requête
    await handleUpdate(req, res);
  } catch (error) {
    console.error('Erreur webhook:', error);
    res.status(500).send('Internal Server Error');
  }
};

/**
 * Configuration du webhook (à exécuter une fois après déploiement)
 * Cette fonction configure l'URL du webhook auprès de Telegram
 */
export const setWebhook = async (req, res) => {
  try {
    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('WEBHOOK_URL non définie dans les variables d\'environnement');
    }

    await bot.api.setWebhook(webhookUrl);

    res.status(200).json({
      success: true,
      message: 'Webhook configuré avec succès',
      url: webhookUrl
    });
  } catch (error) {
    console.error('Erreur configuration webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Mode développement local avec polling
 * Utiliser cette fonction pour tester localement
 */
export const startDevelopment = async () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Démarrage du bot en mode développement (polling)...');

    // Initialiser la base de données
    await initDatabase();

    // Supprimer le webhook si configuré
    await bot.api.deleteWebhook();

    // Démarrer le bot en mode polling
    bot.start();

    console.log('✅ Bot démarré avec succès !');
  }
};

/**
 * Démarrer le serveur HTTP pour Cloud Run
 * Cloud Run attend un serveur HTTP sur le port défini par la variable PORT
 */
const startProductionServer = async () => {
  const PORT = process.env.PORT || 8080;

  // Initialiser la base de données
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }

  // Créer le callback webhook pour grammy
  const handleUpdate = webhookCallback(bot, 'http');

  // Créer le serveur HTTP
  const server = http.createServer(async (req, res) => {
    // Route pour le health check de Cloud Run
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'ZoomChat Bot' }));
      return;
    }

    // Route pour configurer le webhook
    if (req.url === '/setWebhook') {
      try {
        const webhookUrl = process.env.WEBHOOK_URL;
        if (!webhookUrl) {
          throw new Error('WEBHOOK_URL non définie dans les variables d\'environnement');
        }
        await bot.api.setWebhook(webhookUrl);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Webhook configuré', url: webhookUrl }));
      } catch (error) {
        console.error('Erreur configuration webhook:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return;
    }

    // Route principale : webhook Telegram
    if (req.url === '/webhook' || req.url === '/telegramWebhook') {
      try {
        await handleUpdate(req, res);
      } catch (error) {
        console.error('Erreur webhook:', error);
        if (!res.headersSent) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      }
      return;
    }

    // Route non trouvée
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 Mode: ${process.env.NODE_ENV || 'production'}`);
    console.log(`✅ Routes disponibles:`);
    console.log(`   - GET  /health - Health check`);
    console.log(`   - GET  /setWebhook - Configurer le webhook Telegram`);
    console.log(`   - POST /webhook - Recevoir les updates Telegram`);
  });
};

// Démarrer selon l'environnement
if (process.env.NODE_ENV === 'development') {
  startDevelopment().catch(console.error);
} else {
  startProductionServer().catch(console.error);
}
