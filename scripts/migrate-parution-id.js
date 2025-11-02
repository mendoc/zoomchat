import pg from 'pg';
import { env } from '../shared/config/env.js';

const { Client } = pg;

async function migrateParutionId() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    // Supprimer l'ancienne colonne parution_ids
    await client.query(`
      ALTER TABLE bot_responses
      DROP COLUMN IF EXISTS parution_ids;
    `);
    console.log('✅ Colonne parution_ids supprimée');

    // Supprimer la colonne search_results_count
    await client.query(`
      ALTER TABLE bot_responses
      DROP COLUMN IF EXISTS search_results_count;
    `);
    console.log('✅ Colonne search_results_count supprimée');

    // Ajouter la nouvelle colonne parution_id avec FK
    await client.query(`
      ALTER TABLE bot_responses
      ADD COLUMN IF NOT EXISTS parution_id INTEGER
      REFERENCES parutions(id) ON DELETE SET NULL;
    `);
    console.log('✅ Colonne parution_id ajoutée avec FK vers parutions');

    await client.end();
    console.log('✅ Migration terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateParutionId();
