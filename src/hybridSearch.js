import { generateEmbedding } from './embeddingService.js';
import pg from 'pg';

const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

/**
 * Recherche hybride combinant similarité vectorielle et Full-Text Search
 *
 * @param {string} query - Requête utilisateur en langage naturel
 * @param {object} options - Options de recherche
 * @param {number} options.limit - Nombre maximum de résultats (défaut: 10)
 * @param {number} options.vectorWeight - Poids de la recherche vectorielle (0-1, défaut: 0.7)
 * @param {number} options.ftsWeight - Poids du FTS (0-1, défaut: 0.3)
 * @param {number} options.minScore - Score minimum pour inclure un résultat (0-1, défaut: 0.3)
 * @returns {Promise<Array>} Liste des annonces avec scores
 */
export async function hybridSearch(query, options = {}) {
  const {
    limit = 10,
    vectorWeight = 0.7,
    ftsWeight = 0.3,
    minScore = 0.3
  } = options;

  const client = getPool();

  try {
    // Étape 1 : Générer l'embedding de la requête
    console.log(`🔍 Recherche hybride pour: "${query}"`);
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Étape 2 : Recherche hybride avec CTE (Common Table Expressions)
    const sqlQuery = `
      WITH vector_search AS (
        SELECT
          id,
          parution_id,
          category,
          subcategory,
          title,
          reference,
          description,
          contact,
          price,
          location,
          created_at,
          (1 - (embedding <=> $1::vector)) as vector_score
        FROM annonces
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 20
      ),
      fts_search AS (
        SELECT
          id,
          parution_id,
          category,
          subcategory,
          title,
          reference,
          description,
          contact,
          price,
          location,
          created_at,
          ts_rank(search_vector, to_tsquery('french', $2)) as fts_score
        FROM annonces
        WHERE search_vector @@ to_tsquery('french', $2)
        ORDER BY fts_score DESC
        LIMIT 20
      ),
      combined AS (
        SELECT
          COALESCE(v.id, f.id) as id,
          COALESCE(v.parution_id, f.parution_id) as parution_id,
          COALESCE(v.category, f.category) as category,
          COALESCE(v.subcategory, f.subcategory) as subcategory,
          COALESCE(v.title, f.title) as title,
          COALESCE(v.reference, f.reference) as reference,
          COALESCE(v.description, f.description) as description,
          COALESCE(v.contact, f.contact) as contact,
          COALESCE(v.price, f.price) as price,
          COALESCE(v.location, f.location) as location,
          COALESCE(v.created_at, f.created_at) as created_at,
          COALESCE(v.vector_score, 0) * $3 as weighted_vector_score,
          COALESCE(f.fts_score, 0) * $4 as weighted_fts_score,
          (COALESCE(v.vector_score, 0) * $3 + COALESCE(f.fts_score, 0) * $4) as combined_score
        FROM vector_search v
        FULL OUTER JOIN fts_search f ON v.id = f.id
      )
      SELECT *
      FROM combined
      WHERE combined_score >= $5
      ORDER BY combined_score DESC
      LIMIT $6
    `;

    // Préparer la requête FTS (transformation pour tsquery)
    const ftsQuery = query
      .split(/\s+/)
      .filter(word => word.length > 2)
      .join(' & ');

    const result = await client.query(sqlQuery, [
      embeddingStr,
      ftsQuery || query,
      vectorWeight,
      ftsWeight,
      minScore,
      limit
    ]);

    console.log(`✅ ${result.rows.length} résultats trouvés`);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur recherche hybride:', error.message);

    // Fallback : recherche vectorielle uniquement
    if (error.message.includes('tsquery')) {
      console.log('⚠️ Fallback vers recherche vectorielle seule');
      return await vectorSearchOnly(query, limit, minScore);
    }

    throw error;
  }
}

/**
 * Recherche vectorielle uniquement (fallback)
 * @param {string} query - Requête utilisateur
 * @param {number} limit - Nombre de résultats
 * @param {number} minScore - Score minimum
 * @returns {Promise<Array>} Résultats
 */
async function vectorSearchOnly(query, limit, minScore) {
  const client = getPool();

  try {
    const queryEmbedding = await generateEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    const result = await client.query(
      `SELECT
         *,
         (1 - (embedding <=> $1::vector)) as combined_score
       FROM annonces
       WHERE embedding IS NOT NULL
         AND (1 - (embedding <=> $1::vector)) >= $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [embeddingStr, minScore, limit]
    );

    return result.rows;
  } catch (error) {
    console.error('❌ Erreur recherche vectorielle:', error.message);
    throw error;
  }
}

/**
 * Formatte les résultats pour affichage Telegram
 * @param {Array} results - Résultats de recherche
 * @param {string} query - Requête originale
 * @returns {string} Message formaté en Markdown
 */
export function formatSearchResults(results, query) {
  if (!results || results.length === 0) {
    return `❌ Aucune annonce trouvée pour: *${query}*\n\nEssayez avec d'autres mots-clés ou reformulez votre recherche.`;
  }

  let message = `🔍 *Résultats pour:* "${query}"\n`;
  message += `📊 ${results.length} annonce(s) trouvée(s)\n\n`;

  results.forEach((annonce, index) => {
    const score = Math.round(annonce.combined_score * 100);
    const categoryEmoji = getCategoryEmoji(annonce.category);

    message += `${index + 1}. ${categoryEmoji} *${annonce.title || annonce.category}*\n`;

    if (annonce.subcategory) {
      message += `   📌 ${annonce.subcategory}\n`;
    }

    if (annonce.location) {
      message += `   📍 ${annonce.location}\n`;
    }

    if (annonce.price) {
      message += `   💰 ${annonce.price}\n`;
    }

    if (annonce.description) {
      // Tronquer la description à 150 caractères
      const shortDesc = annonce.description.length > 150
        ? annonce.description.substring(0, 150) + '...'
        : annonce.description;
      message += `   📝 ${shortDesc}\n`;
    }

    if (annonce.contact) {
      message += `   📞 ${annonce.contact}\n`;
    }

    message += `   🎯 Pertinence: ${score}%\n`;
    message += `   🔗 Réf: ${annonce.reference}\n\n`;
  });

  message += `💡 _Tapez une autre recherche pour affiner_`;

  return message;
}

/**
 * Retourne un emoji selon la catégorie
 * @param {string} category - Catégorie de l'annonce
 * @returns {string} Emoji correspondant
 */
function getCategoryEmoji(category) {
  if (!category) return '📄';

  const cat = category.toLowerCase();

  if (cat.includes('immobil') || cat.includes('maison') || cat.includes('terrain')) return '🏠';
  if (cat.includes('véhicule') || cat.includes('auto') || cat.includes('moto')) return '🚗';
  if (cat.includes('emploi') || cat.includes('recrutement')) return '💼';
  if (cat.includes('service')) return '🛠️';
  if (cat.includes('vente') || cat.includes('commerce')) return '🛒';
  if (cat.includes('location')) return '🔑';
  if (cat.includes('animaux')) return '🐾';
  if (cat.includes('électro') || cat.includes('informatique')) return '💻';

  return '📄';
}

/**
 * Ferme le pool de connexions
 */
export async function closeSearchPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
