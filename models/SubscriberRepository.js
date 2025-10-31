import { db } from '../db/index.js';
import { subscribers } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '../shared/logger.js';
import { NotFoundError } from '../shared/errors.js';

/**
 * Repository pour gérer les opérations sur les abonnés
 */
export class SubscriberRepository {
  /**
   * Récupère un abonné par son ID
   * @param {number} id - L'ID de l'abonné
   * @returns {Promise<object|null>} L'abonné ou null
   */
  async getById(id) {
    try {
      const result = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.id, id))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ err: error, id }, 'Erreur lors de la récupération de l\'abonné par ID');
      throw error;
    }
  }

  /**
   * Récupère un abonné par son chat ID Telegram
   * @param {number} chatId - L'ID du chat Telegram
   * @returns {Promise<object|null>} L'abonné ou null
   */
  async getByChatId(chatId) {
    try {
      const result = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.chatId, chatId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de la récupération de l\'abonné par chat ID');
      throw error;
    }
  }

  /**
   * Récupère tous les abonnés actifs
   * @returns {Promise<Array>} Liste de tous les abonnés actifs
   */
  async getAllActive() {
    try {
      const result = await db
        .select()
        .from(subscribers)
        .where(eq(subscribers.actif, true))
        .orderBy(subscribers.dateAbonnement);

      logger.info({ count: result.length }, 'Abonnés actifs récupérés');
      return result;
    } catch (error) {
      logger.error({ err: error }, 'Erreur lors de la récupération des abonnés actifs');
      throw error;
    }
  }

  /**
   * Crée un nouvel abonné
   * @param {object} data - Données de l'abonné
   * @param {number} data.chatId - ID du chat Telegram
   * @param {string} data.nom - Nom de l'abonné
   * @param {string} data.telephone - Téléphone de l'abonné
   * @returns {Promise<object>} L'abonné créé
   */
  async create(data) {
    try {
      const result = await db
        .insert(subscribers)
        .values({
          chatId: data.chatId,
          nom: data.nom,
          telephone: data.telephone,
          actif: true,
        })
        .returning();

      logger.info({ chatId: data.chatId, nom: data.nom }, 'Nouvel abonné créé');
      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, "Erreur lors de la création de l'abonné");
      throw error;
    }
  }

  /**
   * Crée un nouvel abonné inactif (pour le tracking)
   * @param {number} chatId - ID du chat Telegram
   * @param {object} userData - Données de l'utilisateur
   * @param {string} userData.firstName - Prénom
   * @param {string} userData.lastName - Nom
   * @param {string} userData.username - Username
   * @returns {Promise<object>} L'abonné créé
   */
  async createInactive(chatId, userData) {
    try {
      const result = await db
        .insert(subscribers)
        .values({
          chatId: chatId,
          nom: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
          username: userData.username,
          actif: false,
        })
        .returning();

      logger.info({ chatId }, 'Nouvel utilisateur (inactif) créé');
      return result[0];
    } catch (error) {
      logger.error({ err: error, chatId }, "Erreur lors de la création de l'utilisateur inactif");
      throw error;
    }
  }

  /**
   * Trouve un abonné par son chat ID ou le crée s'il n'existe pas
   * @param {number} chatId - L'ID du chat Telegram
   * @param {object} userData - Données de l'utilisateur pour la création
   * @returns {Promise<object>} L'abonné trouvé ou nouvellement créé
   */
  async findOrCreate(chatId, userData) {
    const existingSubscriber = await this.getByChatId(chatId);
    if (existingSubscriber) {
      return existingSubscriber;
    }
    return this.createInactive(chatId, userData);
  }

  /**
   * Met à jour ou crée un abonné (upsert)
   * @param {number} chatId - ID du chat Telegram
   * @param {object} data - Données à mettre à jour
   * @param {string} data.nom - Nom de l'abonné
   * @param {string} data.telephone - Téléphone de l'abonné
   * @returns {Promise<object>} L'abonné mis à jour ou créé
   */
  async update(chatId, data) {
    try {
      const result = await db
        .insert(subscribers)
        .values({
          chatId,
          nom: data.nom,
          telephone: data.telephone,
          actif: true,
        })
        .onConflictDoUpdate({
          target: subscribers.chatId,
          set: {
            nom: data.nom,
            telephone: data.telephone,
            actif: true,
            dateAbonnement: new Date(),
          },
        })
        .returning();

      logger.info({ chatId, nom: data.nom }, 'Abonné mis à jour');
      return result[0];
    } catch (error) {
      logger.error({ err: error, chatId, data }, 'Erreur lors de la mise à jour de l\'abonné');
      throw error;
    }
  }

  /**
   * Désactive un abonné (soft delete)
   * @param {number} chatId - ID du chat Telegram
   * @returns {Promise<boolean>} True si l'abonnement a été désactivé
   */
  async deactivate(chatId) {
    try {
      const result = await db
        .update(subscribers)
        .set({ actif: false })
        .where(eq(subscribers.chatId, chatId))
        .returning();

      if (result.length === 0) {
        logger.warn({ chatId }, 'Aucun abonné trouvé pour désactivation');
        return false;
      }

      logger.info({ chatId }, 'Abonnement désactivé');
      return true;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de la désactivation de l\'abonné');
      throw error;
    }
  }
}
