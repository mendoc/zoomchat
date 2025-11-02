import 'dotenv/config';
import { env } from '../shared/config/env.js';
import { logger } from '../shared/logger.js';
import { EmbeddingService } from '../services/search/EmbeddingService.js';
import { getPool } from '../db/connection.js';

/**
 * Script pour générer et sauvegarder les embeddings pour toutes les annonces
 */

const embeddingService = new EmbeddingService(env.GEMINI_API_KEY);
const pool = getPool();

/**
 * Génère et sauvegarde les embeddings pour toutes les annonces
 */
async function generateAllEmbeddings() {
  logger.info('Génération des embeddings pour toutes les annonces');

  try {
    // Récupérer toutes les annonces sans embedding
    const result = await pool.query(
      `SELECT id, category, subcategory, title, reference, description, contact, price, location
       FROM annonces
       WHERE embedding IS NULL
       ORDER BY id ASC`
    );

    const annonces = result.rows;
    logger.info({ count: annonces.length }, 'Annonces à traiter');

    if (annonces.length === 0) {
      logger.info('Toutes les annonces ont déjà un embedding');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();
    const delayMs = 50; // ~1200 req/min

    for (let i = 0; i < annonces.length; i++) {
      const annonce = annonces[i];
      const progress = Math.round(((i + 1) / annonces.length) * 100);

      try {
        // Créer le texte composite
        const text = embeddingService.createCompositeText(annonce);

        // Générer l'embedding
        const embedding = await embeddingService.generateEmbedding(text);

        // Convertir en format PostgreSQL
        const embeddingStr = embeddingService.embeddingToPostgres(embedding);

        // Sauvegarder en base
        await pool.query(`UPDATE annonces SET embedding = $1::vector WHERE id = $2`, [
          embeddingStr,
          annonce.id,
        ]);

        successCount++;

        // Affichage du progrès
        if ((i + 1) % 10 === 0 || i === annonces.length - 1) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const remaining = Math.round((elapsed / (i + 1)) * (annonces.length - i - 1));
          logger.info(
            {
              current: i + 1,
              total: annonces.length,
              progress,
              successCount,
              errorCount,
              elapsed,
              remaining,
            },
            'Progression'
          );
        }

        // Pause pour respecter le rate limit
        if (i < annonces.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        errorCount++;
        logger.error(
          { err: error, annonceId: annonce.id, reference: annonce.reference },
          "Erreur lors de la génération d'embedding"
        );
        continue;
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    logger.info(
      {
        successCount,
        errorCount,
        totalTime,
        totalMinutes: Math.round(totalTime / 60),
        speed: Math.round(annonces.length / (totalTime / 60)),
      },
      'Résumé de génération'
    );

    // Vérification finale
    const verif = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(embedding) as with_embedding,
         COUNT(*) - COUNT(embedding) as without_embedding
       FROM annonces`
    );

    logger.info(
      {
        total: verif.rows[0].total,
        withEmbedding: verif.rows[0].with_embedding,
        withoutEmbedding: verif.rows[0].without_embedding,
      },
      'Vérification finale'
    );

    if (parseInt(verif.rows[0].without_embedding) === 0) {
      logger.info('Toutes les annonces ont maintenant un embedding');
    }
  } catch (error) {
    logger.error({ err: error }, 'Erreur fatale');
    throw error;
  } finally {
    await pool.end();
  }
}

/**
 * Régénère les embeddings pour des annonces spécifiques
 * @param {Array<number>} annonceIds - Liste d'IDs d'annonces
 */
async function regenerateEmbeddings(annonceIds) {
  logger.info({ count: annonceIds.length }, 'Régénération des embeddings');

  try {
    const result = await pool.query(
      `SELECT id, category, subcategory, title, reference, description, contact, price, location
       FROM annonces
       WHERE id = ANY($1::int[])`,
      [annonceIds]
    );

    const annonces = result.rows;
    let successCount = 0;

    for (const annonce of annonces) {
      try {
        const text = embeddingService.createCompositeText(annonce);
        const embedding = await embeddingService.generateEmbedding(text);
        const embeddingStr = embeddingService.embeddingToPostgres(embedding);

        await pool.query(`UPDATE annonces SET embedding = $1::vector WHERE id = $2`, [
          embeddingStr,
          annonce.id,
        ]);

        successCount++;
        logger.info({ annonceId: annonce.id, reference: annonce.reference }, 'Embedding régénéré');

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        logger.error({ err: error, annonceId: annonce.id }, 'Erreur lors de la régénération');
      }
    }

    logger.info({ successCount, total: annonces.length }, 'Embeddings régénérés');
  } catch (error) {
    logger.error({ err: error }, 'Erreur lors de la régénération');
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécution du script
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === '--ids') {
  // Régénération pour des IDs spécifiques
  const ids = args.slice(1).map((id) => parseInt(id));
  regenerateEmbeddings(ids);
} else {
  // Génération complète
  generateAllEmbeddings();
}
