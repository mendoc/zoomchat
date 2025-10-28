import 'dotenv/config';
import pg from 'pg';
import { createCompositeText, generateEmbedding, embeddingToPostgres } from '../src/embeddingService.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Génère et sauvegarde les embeddings pour toutes les annonces
 */
async function generateAllEmbeddings() {
  console.log('🚀 Génération des embeddings pour toutes les annonces\n');

  try {
    // Récupérer toutes les annonces sans embedding
    const result = await pool.query(
      `SELECT id, category, subcategory, title, reference, description, contact, price, location
       FROM annonces
       WHERE embedding IS NULL
       ORDER BY id ASC`
    );

    const annonces = result.rows;
    console.log(`📊 ${annonces.length} annonces à traiter\n`);

    if (annonces.length === 0) {
      console.log('✅ Toutes les annonces ont déjà un embedding');
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
        const text = createCompositeText(annonce);

        // Générer l'embedding
        const embedding = await generateEmbedding(text);

        // Convertir en format PostgreSQL
        const embeddingStr = embeddingToPostgres(embedding);

        // Sauvegarder en base
        await pool.query(
          `UPDATE annonces SET embedding = $1::vector WHERE id = $2`,
          [embeddingStr, annonce.id]
        );

        successCount++;

        // Affichage du progrès
        if ((i + 1) % 10 === 0 || i === annonces.length - 1) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const remaining = Math.round((elapsed / (i + 1)) * (annonces.length - i - 1));
          console.log(
            `✅ ${i + 1}/${annonces.length} (${progress}%) | ` +
            `Réussis: ${successCount} | Erreurs: ${errorCount} | ` +
            `Temps: ${elapsed}s | Reste: ~${remaining}s`
          );
        }

        // Pause pour respecter le rate limit
        if (i < annonces.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Erreur pour annonce ${annonce.id} (${annonce.reference}):`, error.message);

        // Continuer malgré l'erreur
        continue;
      }
    }

    const totalTime = Math.round((Date.now() - startTime) / 1000);

    console.log('\n📊 RÉSUMÉ:');
    console.log(`   ✅ Réussis: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    console.log(`   ⏱️  Temps total: ${totalTime}s (${Math.round(totalTime / 60)}min)`);
    console.log(`   📈 Vitesse: ${Math.round(annonces.length / (totalTime / 60))} annonces/min`);

    // Vérification finale
    const verif = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(embedding) as with_embedding,
         COUNT(*) - COUNT(embedding) as without_embedding
       FROM annonces`
    );

    console.log('\n🔍 VÉRIFICATION:');
    console.log(`   Total annonces: ${verif.rows[0].total}`);
    console.log(`   Avec embedding: ${verif.rows[0].with_embedding}`);
    console.log(`   Sans embedding: ${verif.rows[0].without_embedding}`);

    if (parseInt(verif.rows[0].without_embedding) === 0) {
      console.log('\n🎉 Toutes les annonces ont maintenant un embedding !');
    }
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
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
  console.log(`🔄 Régénération des embeddings pour ${annonceIds.length} annonces\n`);

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
        const text = createCompositeText(annonce);
        const embedding = await generateEmbedding(text);
        const embeddingStr = embeddingToPostgres(embedding);

        await pool.query(
          `UPDATE annonces SET embedding = $1::vector WHERE id = $2`,
          [embeddingStr, annonce.id]
        );

        successCount++;
        console.log(`✅ Annonce ${annonce.id} (${annonce.reference})`);

        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`❌ Erreur pour annonce ${annonce.id}:`, error.message);
      }
    }

    console.log(`\n✅ ${successCount}/${annonces.length} embeddings régénérés`);
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Exécution du script
const args = process.argv.slice(2);

if (args.length > 0 && args[0] === '--ids') {
  // Régénération pour des IDs spécifiques
  const ids = args.slice(1).map(id => parseInt(id));
  regenerateEmbeddings(ids);
} else {
  // Génération complète
  generateAllEmbeddings();
}
