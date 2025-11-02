import pg from 'pg';
import { env } from '../shared/config/env.js';

const { Client } = pg;

async function addParutionIdsColumn() {
  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connecté à la base de données');

    // Ajouter la colonne parution_ids si elle n'existe pas
    await client.query(`
      ALTER TABLE bot_responses
      ADD COLUMN IF NOT EXISTS parution_ids jsonb;
    `);

    console.log('✅ Colonne parution_ids ajoutée avec succès à la table bot_responses');

    await client.end();
    console.log('✅ Migration terminée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

addParutionIdsColumn();
