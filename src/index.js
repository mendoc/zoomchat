import 'dotenv/config';
import { webhookCallback } from 'grammy';
import { createBot } from './bot.js';

// Créer l'instance du bot
const bot = createBot(process.env.TELEGRAM_BOT_TOKEN);

/**
 * Point d'entrée pour Google Cloud Functions
 * Gère les requêtes HTTP webhook de Telegram
 */
export const telegramWebhook = async (req, res) => {
  try {
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

    // Supprimer le webhook si configuré
    await bot.api.deleteWebhook();

    // Démarrer le bot en mode polling
    bot.start();

    console.log('✅ Bot démarré avec succès !');
  }
};

// Démarrer en mode développement si exécuté directement
if (process.env.NODE_ENV === 'development') {
  startDevelopment().catch(console.error);
}
