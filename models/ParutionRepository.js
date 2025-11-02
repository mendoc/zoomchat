import { db } from '../db/index.js';
import { parutions } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../shared/logger.js';

/**
 * Repository pour gérer les opérations sur les parutions
 */
export class ParutionRepository {
  /**
   * Récupère une parution par son ID
   * @param {number} id - L'ID de la parution
   * @returns {Promise<object|null>} La parution ou null
   */
  async getById(id) {
    try {
      const result = await db.select().from(parutions).where(eq(parutions.id, id)).limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ err: error, id }, 'Erreur lors de la récupération de la parution par ID');
      throw error;
    }
  }

  /**
   * Récupère une parution par son numéro
   * @param {string} numero - Le numéro de la parution
   * @returns {Promise<object|null>} La parution ou null
   */
  async getByNumero(numero) {
    try {
      const result = await db.select().from(parutions).where(eq(parutions.numero, numero)).limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error(
        { err: error, numero },
        'Erreur lors de la récupération de la parution par numéro'
      );
      throw error;
    }
  }

  /**
   * Récupère la dernière parution enregistrée
   * @returns {Promise<object|null>} La dernière parution ou null
   */
  async getLatest() {
    try {
      const result = await db.select().from(parutions).orderBy(desc(parutions.createdAt)).limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error({ err: error }, 'Erreur lors de la récupération de la dernière parution');
      throw error;
    }
  }

  /**
   * Crée une nouvelle parution ou met à jour si elle existe (upsert)
   * @param {object} data - Données de la parution
   * @param {string} data.numero - Numéro de la parution
   * @param {string} data.periode - Période de la parution
   * @param {string} data.pdfUrl - URL du PDF
   * @param {string} data.telegramFileId - File ID Telegram (optionnel)
   * @param {Date} data.dateParution - Date de parution (optionnel)
   * @returns {Promise<object>} La parution créée ou mise à jour
   */
  async create(data) {
    try {
      const result = await db
        .insert(parutions)
        .values({
          numero: data.numero,
          periode: data.periode,
          pdfUrl: data.pdfUrl,
          telegramFileId: data.telegramFileId || null,
          dateParution: data.dateParution || new Date(),
        })
        .onConflictDoUpdate({
          target: parutions.numero,
          set: {
            periode: data.periode,
            pdfUrl: data.pdfUrl,
            telegramFileId: data.telegramFileId || null,
            dateParution: data.dateParution || new Date(),
          },
        })
        .returning();

      logger.info({ numero: data.numero }, 'Parution créée ou mise à jour');
      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, 'Erreur lors de la création de la parution');
      throw error;
    }
  }

  /**
   * Met à jour le telegram_file_id d'une parution
   * @param {string} numero - Numéro de la parution
   * @param {string} fileId - File ID Telegram
   * @returns {Promise<object>} La parution mise à jour
   */
  async updateTelegramFileId(numero, fileId) {
    try {
      const result = await db
        .update(parutions)
        .set({ telegramFileId: fileId })
        .where(eq(parutions.numero, numero))
        .returning();

      if (result.length === 0) {
        logger.warn({ numero }, 'Aucune parution trouvée pour mise à jour du file ID');
        return null;
      }

      logger.info({ numero, fileId }, 'File ID Telegram mis à jour');
      return result[0];
    } catch (error) {
      logger.error({ err: error, numero, fileId }, 'Erreur lors de la mise à jour du file ID');
      throw error;
    }
  }
}
