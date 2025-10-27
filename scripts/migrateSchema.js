import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function migrateSchema() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔄 Migration du schéma de la table annonces...\n');

    // Vérifier si la table existe
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'annonces'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('❌ La table annonces n\'existe pas. Utilisez initDatabase() à la place.');
      return;
    }

    // Ajouter les nouvelles colonnes si elles n'existent pas
    const newColumns = [
      { name: 'titre', type: 'TEXT' },
      { name: 'reference', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'localisation', type: 'TEXT' },
      { name: 'type_bien_service', type: 'TEXT' },
      { name: 'email', type: 'TEXT' }
    ];

    for (const col of newColumns) {
      // Vérifier si la colonne existe
      const columnExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'annonces' AND column_name = $1
        );
      `, [col.name]);

      if (!columnExists.rows[0].exists) {
        console.log(`➕ Ajout de la colonne ${col.name}...`);
        await client.query(`ALTER TABLE annonces ADD COLUMN ${col.name} ${col.type};`);
        console.log(`✅ Colonne ${col.name} ajoutée`);
      } else {
        console.log(`✓ Colonne ${col.name} déjà existante`);
      }
    }

    // Copier les données de texte_complet vers description si la colonne existe
    const texteCompletExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'annonces' AND column_name = 'texte_complet'
      );
    `);

    if (texteCompletExists.rows[0].exists) {
      console.log('\n🔄 Migration des données de texte_complet vers description...');
      await client.query(`UPDATE annonces SET description = texte_complet WHERE description IS NULL;`);
      console.log('✅ Données migrées');

      console.log('🗑️ Suppression de la colonne texte_complet...');
      await client.query(`ALTER TABLE annonces DROP COLUMN texte_complet;`);
      console.log('✅ Colonne texte_complet supprimée');
    }

    // Créer les index manquants
    const newIndexes = [
      { name: 'idx_annonces_reference', column: 'reference' },
      { name: 'idx_annonces_localisation', column: 'localisation' }
    ];

    for (const idx of newIndexes) {
      const indexExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes
          WHERE tablename = 'annonces' AND indexname = $1
        );
      `, [idx.name]);

      if (!indexExists.rows[0].exists) {
        console.log(`\n➕ Création de l'index ${idx.name}...`);
        await client.query(`CREATE INDEX ${idx.name} ON annonces(${idx.column});`);
        console.log(`✅ Index ${idx.name} créé`);
      } else {
        console.log(`✓ Index ${idx.name} déjà existant`);
      }
    }

    console.log('\n✅ Migration terminée avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrateSchema();
