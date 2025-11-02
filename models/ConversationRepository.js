import { db } from '../db/connection.js';
import { conversations, botResponses } from '../db/schema/index.js';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { logger } from '../shared/logger.js';

/**
 * Repository pour gérer les conversations et réponses du bot
 * Permet d'enregistrer et récupérer l'historique des interactions
 */
export class ConversationRepository {
  /**
   * Enregistre une interaction utilisateur
   * @param {Object} data - Données de l'interaction
   * @param {number} data.subscriberId - ID du subscriber
   * @param {number} data.chatId - ID du chat Telegram
   * @param {string} data.sessionId - ID de session
   * @param {string} data.interactionType - Type: 'command', 'text_query', 'callback_query'
   * @param {number} [data.messageId] - ID du message Telegram
   * @param {string} [data.messageText] - Texte du message
   * @param {string} [data.commandName] - Nom de la commande (si type='command')
   * @param {string} [data.callbackData] - Données du callback (si type='callback_query')
   * @param {string} [data.searchQuery] - Requête de recherche (si type='text_query')
   * @param {Object} [data.metadata] - Métadonnées supplémentaires
   * @returns {Promise<Object>} Conversation créée avec son ID
   */
  async logInteraction(data) {
    try {
      const result = await db
        .insert(conversations)
        .values({
          subscriberId: data.subscriberId,
          chatId: data.chatId,
          sessionId: data.sessionId,
          interactionType: data.interactionType,
          messageId: data.messageId || null,
          messageText: data.messageText || null,
          commandName: data.commandName || null,
          callbackData: data.callbackData || null,
          searchQuery: data.searchQuery || null,
          metadata: data.metadata || null,
        })
        .returning();

      logger.debug(
        { chatId: data.chatId, type: data.interactionType, conversationId: result[0].id },
        'Interaction logged'
      );

      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, 'Error logging interaction');
      throw error;
    }
  }

  /**
   * Enregistre une réponse du bot
   * @param {Object} data - Données de la réponse
   * @param {number} data.conversationId - ID de la conversation liée
   * @param {number} data.chatId - ID du chat Telegram
   * @param {number} [data.responseMessageId] - ID du message de réponse Telegram
   * @param {string} [data.responseText] - Texte de la réponse
   * @param {string} data.responseType - Type: 'text', 'document', 'search_results', 'error', 'callback_answer'
   * @param {number} [data.searchResultsCount] - Nombre de résultats (si type='search_results')
   * @param {Object} [data.metadata] - Métadonnées supplémentaires
   * @returns {Promise<Object>} Réponse créée avec son ID
   */
  async logBotResponse(data) {
    try {
      const result = await db
        .insert(botResponses)
        .values({
          conversationId: data.conversationId,
          chatId: data.chatId,
          responseMessageId: data.responseMessageId || null,
          responseText: data.responseText || null,
          responseType: data.responseType,
          searchResultsCount: data.searchResultsCount || null,
          metadata: data.metadata || null,
        })
        .returning();

      logger.debug(
        { chatId: data.chatId, type: data.responseType, responseId: result[0].id },
        'Bot response logged'
      );

      return result[0];
    } catch (error) {
      logger.error({ err: error, data }, 'Error logging bot response');
      throw error;
    }
  }

  /**
   * Récupère l'historique complet des conversations d'un chat
   * @param {number} chatId - ID du chat Telegram
   * @param {Object} [options] - Options de pagination et filtrage
   * @param {number} [options.limit=50] - Nombre max de résultats
   * @param {number} [options.offset=0] - Décalage pour la pagination
   * @param {string} [options.sessionId] - Filtrer par session spécifique
   * @returns {Promise<Array>} Liste des conversations
   */
  async getConversationHistory(chatId, options = {}) {
    const { limit = 50, offset = 0, sessionId } = options;

    try {
      let query = db
        .select()
        .from(conversations)
        .where(eq(conversations.chatId, chatId))
        .orderBy(desc(conversations.createdAt))
        .limit(limit)
        .offset(offset);

      // Filtrer par session si spécifié
      if (sessionId) {
        query = db
          .select()
          .from(conversations)
          .where(and(eq(conversations.chatId, chatId), eq(conversations.sessionId, sessionId)))
          .orderBy(desc(conversations.createdAt))
          .limit(limit)
          .offset(offset);
      }

      const result = await query;

      logger.debug({ chatId, count: result.length, sessionId }, 'Conversation history retrieved');

      return result;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Error fetching conversation history');
      throw error;
    }
  }

  /**
   * Récupère les interactions récentes d'un chat
   * @param {number} chatId - ID du chat Telegram
   * @param {number} [limit=10] - Nombre de résultats
   * @returns {Promise<Array>} Liste des interactions récentes
   */
  async getRecentInteractions(chatId, limit = 10) {
    try {
      const result = await db
        .select()
        .from(conversations)
        .where(eq(conversations.chatId, chatId))
        .orderBy(desc(conversations.createdAt))
        .limit(limit);

      return result;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Error fetching recent interactions');
      throw error;
    }
  }

  /**
   * Récupère les réponses du bot pour une conversation donnée
   * @param {number} conversationId - ID de la conversation
   * @returns {Promise<Array>} Liste des réponses du bot
   */
  async getBotResponsesForConversation(conversationId) {
    try {
      const result = await db
        .select()
        .from(botResponses)
        .where(eq(botResponses.conversationId, conversationId))
        .orderBy(botResponses.createdAt);

      return result;
    } catch (error) {
      logger.error({ err: error, conversationId }, 'Error fetching bot responses');
      throw error;
    }
  }

  /**
   * Récupère toutes les interactions d'une session
   * @param {string} sessionId - ID de session
   * @returns {Promise<Array>} Liste des interactions de la session
   */
  async getSessionInteractions(sessionId) {
    try {
      const result = await db
        .select()
        .from(conversations)
        .where(eq(conversations.sessionId, sessionId))
        .orderBy(conversations.createdAt);

      return result;
    } catch (error) {
      logger.error({ err: error, sessionId }, 'Error fetching session interactions');
      throw error;
    }
  }

  /**
   * Récupère les statistiques d'interaction pour un chat
   * @param {number} chatId - ID du chat Telegram
   * @param {Object} [options] - Options de filtrage
   * @param {Date} [options.since] - Date de début pour les stats
   * @returns {Promise<Object>} Statistiques par type d'interaction
   */
  async getInteractionStats(chatId, options = {}) {
    const { since } = options;

    try {
      const conditions = [eq(conversations.chatId, chatId)];

      if (since) {
        conditions.push(gte(conversations.createdAt, since));
      }

      const result = await db
        .select({
          interactionType: conversations.interactionType,
          count: sql`count(*)::int`,
        })
        .from(conversations)
        .where(and(...conditions))
        .groupBy(conversations.interactionType);

      // Transformer en objet pour faciliter l'utilisation
      const stats = result.reduce((acc, row) => {
        acc[row.interactionType] = row.count;
        return acc;
      }, {});

      logger.debug({ chatId, stats }, 'Interaction stats retrieved');

      return stats;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Error fetching interaction stats');
      throw error;
    }
  }

  /**
   * Compte le nombre total d'interactions pour un chat
   * @param {number} chatId - ID du chat Telegram
   * @returns {Promise<number>} Nombre total d'interactions
   */
  async getTotalInteractionCount(chatId) {
    try {
      const result = await db
        .select({ count: sql`count(*)::int` })
        .from(conversations)
        .where(eq(conversations.chatId, chatId));

      return result[0].count;
    } catch (error) {
      logger.error({ err: error, chatId }, 'Error counting interactions');
      throw error;
    }
  }

  /**
   * Récupère les requêtes de recherche les plus fréquentes
   * @param {number} [limit=10] - Nombre de résultats
   * @returns {Promise<Array>} Liste des requêtes avec leur fréquence
   */
  async getTopSearchQueries(limit = 10) {
    try {
      const result = await db
        .select({
          searchQuery: conversations.searchQuery,
          count: sql`count(*)::int`,
        })
        .from(conversations)
        .where(eq(conversations.interactionType, 'text_query'))
        .groupBy(conversations.searchQuery)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return result.filter((r) => r.searchQuery !== null);
    } catch (error) {
      logger.error({ err: error }, 'Error fetching top search queries');
      throw error;
    }
  }

  /**
   * Récupère la commande la plus utilisée
   * @param {Object} [options] - Options de filtrage
   * @param {Date} [options.since] - Date de début
   * @returns {Promise<Array>} Liste des commandes avec leur fréquence
   */
  async getTopCommands(options = {}) {
    const { since } = options;

    try {
      const conditions = [eq(conversations.interactionType, 'command')];

      if (since) {
        conditions.push(gte(conversations.createdAt, since));
      }

      const result = await db
        .select({
          commandName: conversations.commandName,
          count: sql`count(*)::int`,
        })
        .from(conversations)
        .where(and(...conditions))
        .groupBy(conversations.commandName)
        .orderBy(desc(sql`count(*)`));

      return result.filter((r) => r.commandName !== null);
    } catch (error) {
      logger.error({ err: error }, 'Error fetching top commands');
      throw error;
    }
  }
}
