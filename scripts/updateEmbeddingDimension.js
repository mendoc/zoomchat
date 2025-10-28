import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function updateDimension() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔧 Recréation de la colonne embedding (1536 dimensions avec index HNSW)\n');

    // 1. Supprimer l'index
    console.log('⚙️  Suppression de l\'ancien index...');
    await pool.query('DROP INDEX IF EXISTS idx_annonces_embedding');
    console.log('   ✅ Index supprimé\n');

    // 2. Supprimer la colonne embedding
    console.log('⚙️  Suppression de la colonne embedding...');
    await pool.query('ALTER TABLE annonces DROP COLUMN IF EXISTS embedding');
    console.log('   ✅ Colonne supprimée\n');

    // 3. Recréer la colonne avec 1536 dimensions
    console.log('⚙️  Création de la colonne embedding (1536 dim)...');
    await pool.query('ALTER TABLE annonces ADD COLUMN embedding vector(1536)');
    console.log('   ✅ Colonne créée\n');

    // 4. Créer un index HNSW (optimal jusqu'à 2000 dimensions)
    console.log('⚙️  Création de l\'index HNSW...');
    await pool.query('CREATE INDEX idx_annonces_embedding ON annonces USING hnsw (embedding vector_cosine_ops)');
    console.log('   ✅ Index HNSW créé\n');

    console.log('✅ Migration terminée avec succès !');
    console.log('\n💡 Prochaine étape: node scripts/generateEmbeddings.js');
    console.log('⚠️  Note: Quota API Gemini dépassé. Réessayez plus tard.');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

updateDimension();
