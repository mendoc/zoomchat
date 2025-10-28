import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

/**
 * Affiche les statistiques d'utilisation des embeddings
 */
async function checkQuota() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('📊 STATISTIQUES D\'UTILISATION DES EMBEDDINGS\n');

    // Compter les annonces avec/sans embeddings
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        COUNT(*) - COUNT(embedding) as without_embedding,
        COUNT(CASE WHEN embedding IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as percentage
      FROM annonces
    `);

    const stats = statsResult.rows[0];

    console.log('🗄️  BASE DE DONNÉES:');
    console.log(`   Total annonces: ${stats.total}`);
    console.log(`   ✅ Avec embedding: ${stats.with_embedding}`);
    console.log(`   ❌ Sans embedding: ${stats.without_embedding}`);
    console.log(`   📈 Pourcentage: ${parseFloat(stats.percentage).toFixed(1)}%`);
    console.log();

    // Estimer le nombre de requêtes API
    console.log('🌐 API GEMINI:');
    console.log(`   Embeddings générés: ${stats.with_embedding}`);
    console.log(`   Coût estimé: $${(stats.with_embedding * 0.000025).toFixed(4)}`);
    console.log();

    // Quotas Gemini gratuits
    console.log('📋 QUOTAS GRATUITS GEMINI:');
    console.log('   Limite par minute: 1500 requêtes');
    console.log('   Limite par jour: Illimitée (tier gratuit)');
    console.log();

    // Annonces par parution
    const parutionStats = await pool.query(`
      SELECT
        p.numero,
        p.periode,
        COUNT(a.id) as total_annonces,
        COUNT(a.embedding) as with_embedding,
        COUNT(*) - COUNT(a.embedding) as without_embedding
      FROM parutions p
      LEFT JOIN annonces a ON a.parution_id = p.id
      GROUP BY p.id, p.numero, p.periode
      ORDER BY p.date_parution DESC
      LIMIT 5
    `);

    console.log('📰 DERNIÈRES PARUTIONS:');
    parutionStats.rows.forEach(row => {
      const status = row.with_embedding === row.total_annonces ? '✅' : '⚠️';
      console.log(`   ${status} N°${row.numero} (${row.periode}): ${row.with_embedding}/${row.total_annonces} embeddings`);
    });
    console.log();

    // Recommandations
    if (stats.without_embedding > 0) {
      console.log('💡 ACTIONS RECOMMANDÉES:');
      console.log(`   → ${stats.without_embedding} annonces sans embedding`);
      console.log('   → Exécutez: node scripts/generateEmbeddings.js');
    } else {
      console.log('✅ SYSTÈME À JOUR:');
      console.log('   Toutes les annonces ont leur embedding !');
    }
    console.log();

    // Liens utiles
    console.log('🔗 LIENS UTILES:');
    console.log('   Dashboard Gemini: https://aistudio.google.com/app/apikey');
    console.log('   Quotas & Usage: https://ai.google.dev/gemini-api/docs/rate-limits');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuota();
