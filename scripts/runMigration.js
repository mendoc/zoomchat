import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Démarrage de la migration...\n');

    // Lire le fichier SQL
    const migrationSQL = fs.readFileSync('migrations/add_annonces_fields.sql', 'utf-8');

    // Exécuter la migration
    await pool.query(migrationSQL);

    console.log('\n✅ Migration terminée avec succès !');
    console.log('   - Colonnes ajoutées: subcategory, contact, parution_id');
    console.log('   - Index créés: idx_annonces_parution_id, idx_annonces_search_vector');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
