import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Exécute la migration SQL pour ajouter pgvector et la colonne embedding
 */
async function runMigration() {
  console.log('🚀 Exécution de la migration pgvector\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // 1. Activer l'extension pgvector
    console.log('⚙️  Étape 1/3: Activation de l\'extension pgvector...');
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('   ✅ Extension pgvector activée\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Extension déjà activée\n');
      } else {
        throw error;
      }
    }

    // 2. Ajouter la colonne embedding
    console.log('⚙️  Étape 2/3: Ajout de la colonne embedding...');
    try {
      await pool.query('ALTER TABLE annonces ADD COLUMN IF NOT EXISTS embedding vector(768)');
      console.log('   ✅ Colonne embedding ajoutée\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Colonne déjà existante\n');
      } else {
        throw error;
      }
    }

    // 3. Créer l'index HNSW
    console.log('⚙️  Étape 3/3: Création de l\'index HNSW...');
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_annonces_embedding ON annonces USING hnsw (embedding vector_cosine_ops)');
      console.log('   ✅ Index HNSW créé\n');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('   ⚠️  Index déjà existant\n');
      } else {
        throw error;
      }
    }

    // Vérification finale
    console.log('\n🔍 VÉRIFICATION FINALE:\n');

    // Vérifier l'extension pgvector
    const extResult = await pool.query(
      `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`
    );

    if (extResult.rows.length > 0) {
      console.log(`✅ Extension pgvector: installée (version ${extResult.rows[0].extversion})`);
    } else {
      console.log('❌ Extension pgvector: NON INSTALLÉE');
    }

    // Vérifier la colonne embedding
    const colResult = await pool.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'annonces' AND column_name = 'embedding'`
    );

    if (colResult.rows.length > 0) {
      console.log(`✅ Colonne embedding: ajoutée (type: ${colResult.rows[0].data_type})`);
    } else {
      console.log('❌ Colonne embedding: NON AJOUTÉE');
    }

    // Vérifier l'index
    const idxResult = await pool.query(
      `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'annonces' AND indexname = 'idx_annonces_embedding'`
    );

    if (idxResult.rows.length > 0) {
      console.log(`✅ Index HNSW: créé`);
    } else {
      console.log('❌ Index HNSW: NON CRÉÉ');
    }

    // Compter les annonces
    const countResult = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(embedding) as with_embedding,
         COUNT(*) - COUNT(embedding) as without_embedding
       FROM annonces`
    );

    console.log('\n📊 STATISTIQUES:');
    console.log(`   Total annonces: ${countResult.rows[0].total}`);
    console.log(`   Avec embedding: ${countResult.rows[0].with_embedding}`);
    console.log(`   Sans embedding: ${countResult.rows[0].without_embedding}`);

    console.log('\n✅ Migration terminée avec succès !');
    console.log('\n💡 PROCHAINES ÉTAPES:');
    console.log('   1. Générer les embeddings: node scripts/generateEmbeddings.js');
    console.log('   2. Tester la recherche hybride');
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
