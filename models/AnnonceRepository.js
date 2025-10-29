import { db } from '../db/index.js';
import { annonces } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { getPool } from '../db/connection.js';
import { logger } from '../shared/logger.js';

/**
 * Repository pour gérer les opérations sur les annonces
 */
export class AnnonceRepository {
  /**
   * Récupère une annonce par son ID
   * @param {number} id - L'ID de l'annonce
   * @returns {Promise<object|null>} L'annonce ou null
   */
  async getById(id) {
    try {
      const result = await db
        .select()
        .from(annonces)
        .where(eq(annonces.id, id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ err: error, id }, 'Erreur lors de la récupération de l\'annonce par ID');
      throw error;
    }
  }

  /**
   * Récupère toutes les annonces d'une parution
   * @param {number} parutionId - ID de la parution
   * @returns {Promise<Array>} Liste des annonces
   */
  async getByParution(parutionId) {
    try {
      const result = await db
        .select()
        .from(annonces)
        .where(eq(annonces.parutionId, parutionId));

      return result;
    } catch (error) {
      logger.error({ err: error, parutionId }, 'Erreur lors de la récupération des annonces par parution');
      throw error;
    }
  }

  /**
   * Crée une nouvelle annonce
   * @param {object} data - Données de l'annonce
   * @returns {Promise<object>} L'annonce créée
   */
  async create(data) {
    try {
      const result = await db
        .insert(annonces)
        .values({
          parutionId: data.parutionId,
          category: data.category,
          subcategory: data.subcategory,
          title: data.title,
          reference: data.reference,
          description: data.description,
          contact: data.contact,
          price: data.price,
          location: data.location,
          embedding: data.embedding || null,
        })
        .returning();

      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, 'Erreur lors de la création de l\'annonce');
      throw error;
    }
  }

  /**
   * Crée plusieurs annonces en une seule transaction
   * @param {Array<object>} annoncesList - Liste des annonces à créer
   * @returns {Promise<Array>} Les annonces créées
   */
  async bulkCreate(annoncesList) {
    if (!annoncesList || annoncesList.length === 0) {
      return [];
    }

    try {
      const result = await db.transaction(async (tx) => {
        const created = [];

        for (const data of annoncesList) {
          const inserted = await tx
            .insert(annonces)
            .values({
              parutionId: data.parutionId,
              category: data.category,
              subcategory: data.subcategory,
              title: data.title,
              reference: data.reference,
              description: data.description,
              contact: data.contact,
              price: data.price,
              location: data.location,
              embedding: data.embedding || null,
            })
            .returning();

          created.push(inserted[0]);
        }

        return created;
      });

      logger.info({ count: result.length }, 'Annonces créées en bulk');
      return result;
    } catch (error) {
      logger.error({ err: error, count: annoncesList.length }, 'Erreur lors de la création bulk des annonces');
      throw error;
    }
  }

  /**
   * Recherche hybride combinant vector similarity et full-text search
   * IMPORTANT: Utilise raw SQL pour la requête CTE complexe
   *
   * @param {Array<number>} queryEmbedding - Vector embedding de la requête
   * @param {string} queryText - Texte de recherche pour FTS
   * @param {object} options - Options de recherche
   * @param {number} options.vectorWeight - Poids de la recherche vectorielle (défaut: 0.6)
   * @param {number} options.ftsWeight - Poids de la recherche FTS (défaut: 0.4)
   * @param {number} options.minScore - Score minimum combiné (défaut: 0.1)
   * @param {number} options.limit - Nombre maximum de résultats (défaut: 10)
   * @returns {Promise<Array>} Résultats de la recherche
   */
  async hybridSearch(queryEmbedding, queryText, options = {}) {
    const {
      vectorWeight = 0.6,
      ftsWeight = 0.4,
      minScore = 0.1,
      limit = 10,
    } = options;

    const pool = getPool();

    try {
      // Préparer le texte pour tsquery (remplacer espaces par &)
      const tsqueryText = queryText
        .trim()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .join(' & ');

      // Requête CTE complexe avec vector search + FTS
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

      const result = await pool.query(sqlQuery, [
        JSON.stringify(queryEmbedding),
        tsqueryText,
        vectorWeight,
        ftsWeight,
        minScore,
        limit,
      ]);

      logger.info(
        {
          queryText,
          resultCount: result.rows.length,
          vectorWeight,
          ftsWeight
        },
        'Recherche hybride effectuée'
      );

      return result.rows;
    } catch (error) {
      logger.error(
        { err: error, queryText, options },
        'Erreur lors de la recherche hybride'
      );
      throw error;
    }
  }
}
