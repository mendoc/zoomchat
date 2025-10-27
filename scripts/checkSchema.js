import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkSchema() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Vérification du schéma de la table annonces...\n');

    // Vérifier si la table existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'annonces'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La table annonces n\'existe pas.');
      return;
    }

    console.log('✅ La table annonces existe.\n');

    // Lister les colonnes
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'annonces'
      ORDER BY ordinal_position;
    `);

    console.log('Colonnes de la table annonces:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Vérifier les index
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'annonces';
    `);

    console.log('\nIndex sur la table annonces:');
    indexes.rows.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.end();
  }
}

checkSchema();
