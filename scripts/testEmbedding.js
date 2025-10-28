import 'dotenv/config';
import pg from 'pg';
import { createCompositeText, generateEmbedding } from '../src/embeddingService.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function test() {
  try {
    // Récupérer une annonce au hasard
    const result = await pool.query(
      'SELECT * FROM annonces ORDER BY RANDOM() LIMIT 1'
    );

    if (result.rows.length === 0) {
      console.log('❌ Aucune annonce trouvée');
      process.exit(1);
    }

    const annonce = result.rows[0];
    console.log('📄 Annonce sélectionnée:');
    console.log('   Référence:', annonce.reference);
    console.log('   Titre:', annonce.title);
    console.log('   Catégorie:', annonce.category);
    console.log();

    // Créer le texte composite
    const text = createCompositeText(annonce);
    console.log('📝 Texte composite généré:');
    console.log('  ', text.substring(0, 150) + '...');
    console.log();

    // Tester la génération d'embedding
    console.log('🔄 Test génération embedding...');
    const startTime = Date.now();

    const embedding = await generateEmbedding(text);

    const duration = Date.now() - startTime;

    console.log('✅ Embedding généré avec succès !');
    console.log('   Dimensions:', embedding.length);
    console.log('   Durée:', duration, 'ms');
    console.log('   Premières valeurs:', embedding.slice(0, 5).map(v => v.toFixed(4)));
    console.log();
    console.log('🎉 Les quotas API sont réinitialisés !');
    console.log('💡 Vous pouvez maintenant lancer: node scripts/generateEmbeddings.js');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error.message);

    if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
      console.log();
      console.log('⏳ Quota API toujours dépassé. Réessayez plus tard.');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
