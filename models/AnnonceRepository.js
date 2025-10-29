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
   * Recherche vectorielle pure basée sur la similarité sémantique
   * @param {Array<number>} queryEmbedding - Vector embedding de la requête
   * @param {object} options - Options de recherche
   * @param {number} options.minScore - Score minimum (défaut: 0.3)
   * @param {number} options.limit - Nombre maximum de résultats (défaut: 10)
   * @returns {Promise<Array>} Résultats de la recherche
   */
  async vectorSearch(queryEmbedding, options = {}) {
    const {
      minScore = 0.3,
      limit = 10,
    } = options;

    const pool = getPool();

    try {
      const sqlQuery = `
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
          AND (1 - (embedding <=> $1::vector)) >= $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
      `;

      const result = await pool.query(sqlQuery, [
        JSON.stringify(queryEmbedding),
        minScore,
        limit,
      ]);

      logger.info(
        {
          resultCount: result.rows.length,
          minScore,
          limit
        },
        'Recherche vectorielle effectuée'
      );

      return result.rows;
    } catch (error) {
      logger.error(
        { err: error, options },
        'Erreur lors de la recherche vectorielle'
      );
      throw error;
    }
  }
}
