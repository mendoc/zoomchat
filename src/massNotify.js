import { Bot } from 'grammy';
import { addParution, getAllActiveSubscribers, logEnvoi, getEnvoisByParution, initDatabase } from './database.js';

// Délai entre chaque envoi pour respecter les limites Telegram (20 msg/sec)
const DELAY_BETWEEN_SENDS = 50; // 50ms = 20 envois/sec max

/**
 * Fonction utilitaire pour attendre un certain délai
 * @param {number} ms - Délai en millisecondes
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Cloud Function pour l'envoi en masse aux abonnés
 * Appelée par Google Apps Script après l'extraction du file_id Telegram
 *
 * @param {object} req - Requête HTTP
 * @param {object} res - Réponse HTTP
 */
export async function massNotify(req, res) {
  try {
    // Vérifier la méthode HTTP
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Méthode non autorisée. Utilisez POST.'
      });
    }

    // Vérifier l'authentification
    const authHeader = req.headers.authorization;
    const expectedToken = `Bearer ${process.env.MASS_NOTIFY_SECRET}`;

    if (!authHeader || authHeader !== expectedToken) {
      console.error('❌ Authentification échouée');
      return res.status(401).json({
        success: false,
        error: 'Non autorisé'
      });
    }

    // Initialiser la base de données
    await initDatabase();

    // Extraire les données de la requête
    const { numero, periode, pdfUrl, telegramFileId, caption } = req.body;

    // Validation des données
    if (!numero || !periode || !pdfUrl || !telegramFileId) {
      return res.status(400).json({
        success: false,
        error: 'Données manquantes. Requis: numero, periode, pdfUrl, telegramFileId'
      });
    }

    console.log(`📬 Démarrage envoi en masse - Parution ${numero}`);

    // Enregistrer la parution en base de données
    const parution = await addParution({
      numero,
      periode,
      pdfUrl,
      telegramFileId,
      dateParution: new Date()
    });

    console.log(`✅ Parution enregistrée: ${parution.id}`);

    // Récupérer tous les abonnés actifs
    const subscribers = await getAllActiveSubscribers();

    if (subscribers.length === 0) {
      console.log('⚠️ Aucun abonné actif trouvé');
      return res.status(200).json({
        success: true,
        message: 'Aucun abonné actif',
        stats: { total: 0, success: 0, failed: 0 }
      });
    }

    console.log(`👥 ${subscribers.length} abonnés actifs trouvés`);

    // Créer une instance du bot Telegram
    const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

    // Compteurs pour les statistiques
    let successCount = 0;
    let failedCount = 0;

    // Envoyer le PDF à chaque abonné
    for (const subscriber of subscribers) {
      try {
        // Envoyer le document via file_id
        await bot.api.sendDocument(subscriber.chat_id, telegramFileId, {
          caption: caption || `Zoom Hebdo ${numero} du ${periode}`
        });

        // Logger le succès
        await logEnvoi(parution.id, subscriber.id, 'success');
        successCount++;

        console.log(`✅ Envoi réussi à ${subscriber.nom} (${subscriber.chat_id})`);

      } catch (error) {
        // Logger l'échec
        await logEnvoi(parution.id, subscriber.id, 'failed', error.message);
        failedCount++;

        console.error(`❌ Échec envoi à ${subscriber.nom} (${subscriber.chat_id}):`, error.message);
      }

      // Délai entre chaque envoi pour respecter les rate limits
      await sleep(DELAY_BETWEEN_SENDS);
    }

    // Récupérer les statistiques finales
    const stats = await getEnvoisByParution(parution.id);

    console.log(`📊 Envoi terminé - Succès: ${stats.success}/${stats.total}, Échecs: ${stats.failed}`);

    // Retourner la réponse
    return res.status(200).json({
      success: true,
      message: `Envoi en masse terminé pour la parution ${numero}`,
      stats: {
        total: stats.total,
        success: stats.success,
        failed: stats.failed
      },
      parution: {
        id: parution.id,
        numero: parution.numero,
        periode: parution.periode
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi en masse:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur : ' + error.message,
      details: error.message
    });
  }
}
