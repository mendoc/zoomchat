import { db } from '../db/index.js';
import { envois } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../shared/logger.js';

/**
 * Repository pour gérer les opérations sur les envois
 */
export class EnvoiRepository {
  /**
   * Crée un nouvel envoi dans l'historique
   * @param {object} data - Données de l'envoi
   * @param {number} data.parutionId - ID de la parution
   * @param {number} data.subscriberId - ID de l'abonné
   * @param {string} data.statut - Statut de l'envoi ('success' ou 'failed')
   * @param {string} data.errorMessage - Message d'erreur (optionnel)
   * @returns {Promise<object>} L'envoi enregistré
   */
  async create(data) {
    try {
      const result = await db
        .insert(envois)
        .values({
          parutionId: data.parutionId,
          subscriberId: data.subscriberId,
          statut: data.statut,
          errorMessage: data.errorMessage || null,
        })
        .returning();

      logger.info(
        {
          parutionId: data.parutionId,
          subscriberId: data.subscriberId,
          statut: data.statut
        },
        'Envoi enregistré'
      );
      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, 'Erreur lors de l\'enregistrement de l\'envoi');
      throw error;
    }
  }

  /**
   * Récupère tous les envois pour une parution donnée
   * @param {number} parutionId - ID de la parution
   * @returns {Promise<Array>} Liste des envois
   */
  async getByParution(parutionId) {
    try {
      const result = await db
        .select()
        .from(envois)
        .where(eq(envois.parutionId, parutionId));

      return result;
    } catch (error) {
      logger.error({ err: error, parutionId }, 'Erreur lors de la récupération des envois par parution');
      throw error;
    }
  }

  /**
   * Récupère tous les envois pour un abonné donné
   * @param {number} subscriberId - ID de l'abonné
   * @returns {Promise<Array>} Liste des envois
   */
  async getBySubscriber(subscriberId) {
    try {
      const result = await db
        .select()
        .from(envois)
        .where(eq(envois.subscriberId, subscriberId));

      return result;
    } catch (error) {
      logger.error({ err: error, subscriberId }, 'Erreur lors de la récupération des envois par abonné');
      throw error;
    }
  }

  /**
   * Compte les envois réussis pour une parution
   * @param {number} parutionId - ID de la parution
   * @returns {Promise<number>} Nombre d'envois réussis
   */
  async countSuccessByParution(parutionId) {
    try {
      const result = await db
        .select()
        .from(envois)
        .where(eq(envois.parutionId, parutionId))
        .where(eq(envois.statut, 'success'));

      return result.length;
    } catch (error) {
      logger.error({ err: error, parutionId }, 'Erreur lors du comptage des envois réussis');
      throw error;
    }
  }

  /**
   * Compte les envois échoués pour une parution
   * @param {number} parutionId - ID de la parution
   * @returns {Promise<number>} Nombre d'envois échoués
   */
  async countFailedByParution(parutionId) {
    try {
      const result = await db
        .select()
        .from(envois)
        .where(eq(envois.parutionId, parutionId))
        .where(eq(envois.statut, 'failed'));

      return result.length;
    } catch (error) {
      logger.error({ err: error, parutionId }, 'Erreur lors du comptage des envois échoués');
      throw error;
    }
  }
}
