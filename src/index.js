import 'dotenv/config';
import http from 'http';
import { URL } from 'url';
import { webhookCallback } from 'grammy';
import { createBot, notifyExtractionAdmin } from './bot.js';
import { initDatabase, searchAnnonces, getLatestParution, saveAnnonce } from './database.js';
import { downloadAndSplitPDF } from './pdfSplitter.js';
import { extractAllAnnonces, cleanAnnonce } from './geminiExtractor.js';
import { createCompositeText, generateEmbedding, embeddingToPostgres } from './embeddingService.js';

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
 * Helper pour lire le body d'une requête POST
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

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

    // Route d'extraction et sauvegarde des annonces (appelée par Apps Script)
    if (req.url === '/extract' && req.method === 'POST') {
      const startTime = Date.now();
      let parution = null;
      let extractionResult = null;

      try {
        const body = await readBody(req);

        // Récupérer la dernière parution
        parution = await getLatestParution();

        if (!parution) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Aucune parution trouvée en base de données'
          }));
          return;
        }

        console.log(`📥 Extraction des annonces pour la parution N°${parution.numero} (${parution.periode})`);

        // 1. Télécharger et découper le PDF (pages 1, 3, 5, 6, 7)
        const pages = await downloadAndSplitPDF(parution.pdf_url);
        console.log(`📄 ${pages.length} pages découpées`);

        // 2. Extraire les annonces avec Gemini (avec retry automatique)
        extractionResult = await extractAllAnnonces(pages);
        console.log(`🤖 ${extractionResult.annonces.length} annonces extraites brutes`);

        // 3. Nettoyer et filtrer les annonces (garder uniquement celles avec une référence)
        const annoncesCleaned = extractionResult.annonces
          .map(annonce => cleanAnnonce(annonce))
          .filter(annonce => annonce.reference); // Filtrer celles sans référence

        console.log(`✅ ${annoncesCleaned.length} annonces valides (avec référence)`);

        // 4. Sauvegarder toutes les annonces
        let saved = 0;
        let saveErrors = 0;

        for (const annonce of annoncesCleaned) {
          try {
            // Générer l'embedding pour l'annonce
            let embedding = null;
            try {
              const compositeText = createCompositeText(annonce);
              const embeddingVector = await generateEmbedding(compositeText);
              embedding = embeddingToPostgres(embeddingVector);
              console.log(`✅ Embedding généré pour ${annonce.reference}`);
            } catch (embError) {
              console.error(`⚠️ Erreur embedding pour ${annonce.reference}:`, embError.message);
              // Continuer même si l'embedding échoue
            }

            await saveAnnonce({
              parutionId: parution.id,
              category: annonce.category,
              subcategory: annonce.subcategory,
              title: annonce.title,
              reference: annonce.reference,
              description: annonce.description,
              contact: annonce.contact,
              price: annonce.price,
              location: annonce.location,
              embedding: embedding
            });
            saved++;
          } catch (error) {
            console.error(`Erreur sauvegarde annonce ${annonce.reference}:`, error.message);
            saveErrors++;
          }
        }

        console.log(`💾 ${saved} annonces sauvegardées en base de données`);

        const duration = Date.now() - startTime;

        // Envoyer le rapport à l'admin
        await notifyExtractionAdmin(
          bot,
          {
            numero: parution.numero,
            periode: parution.periode
          },
          extractionResult.stats,
          duration,
          saved,
          saveErrors
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          parution: {
            numero: parution.numero,
            periode: parution.periode
          },
          stats: {
            pagesTraitees: pages.length,
            extraitesBrutes: extractionResult.annonces.length,
            filtrees: annoncesCleaned.length,
            sauvegardees: saved,
            erreurs: saveErrors
          }
        }));
      } catch (error) {
        console.error('Erreur extraction:', error);

        const duration = Date.now() - startTime;

        // Envoyer le rapport d'erreur à l'admin si nous avons les infos
        if (parution && extractionResult) {
          await notifyExtractionAdmin(
            bot,
            {
              numero: parution.numero,
              periode: parution.periode
            },
            extractionResult.stats,
            duration,
            0,
            0
          ).catch(notifyErr => {
            console.error('Erreur notification admin:', notifyErr);
          });
        }

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message || 'Erreur lors de l\'extraction des annonces'
        }));
      }
      return;
    }

    // Route de recherche d'annonces
    if (req.url && req.url.startsWith('/search')) {
      try {
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const query = urlObj.searchParams.get('q');
        const limit = parseInt(urlObj.searchParams.get('limit') || '10', 10);

        if (!query) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Paramètre "q" manquant' }));
          return;
        }

        const resultats = await searchAnnonces(query, limit);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          resultats,
          total: resultats.length,
          query
        }));
      } catch (error) {
        console.error('Erreur recherche:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erreur lors de la recherche' }));
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
    console.log(`   - POST /extract - Extraire et sauvegarder les annonces du dernier PDF`);
    console.log(`   - GET  /search?q=... - Rechercher des annonces`);
  });
};

// Démarrer selon l'environnement
if (process.env.NODE_ENV === 'development') {
  startDevelopment().catch(console.error);
} else {
  startProductionServer().catch(console.error);
}
