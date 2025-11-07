import { getPool } from '../db/connection.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  const pool = getPool();

  try {
    console.log('📝 Lecture de la migration...');
    const migrationPath = join(__dirname, '../migrations/0003_allow_null_telegram_file_id.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Application de la migration...');
    console.log(sql);

    await pool.query(sql);

    console.log('✅ Migration appliquée avec succès !');

    // Vérifier que la colonne accepte maintenant NULL
    const result = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'parutions' AND column_name = 'telegram_file_id';
    `);

    console.log('📊 État de la colonne telegram_file_id:', result.rows[0]);
  } catch (error) {
    console.error("❌ Erreur lors de l'application de la migration:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration();
