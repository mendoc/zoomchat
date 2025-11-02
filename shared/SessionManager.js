import { randomUUID } from 'crypto';
import { logger } from './logger.js';

/**
 * Gestionnaire de sessions de conversation
 * Crée et maintient des sessions pour regrouper les interactions utilisateur
 *
 * Une nouvelle session est créée après 30 minutes d'inactivité
 */
export class SessionManager {
  constructor(sessionTimeoutMs = 30 * 60 * 1000) {
    // 30 minutes par défaut
    this.sessionTimeoutMs = sessionTimeoutMs;

    // Cache en mémoire: Map<chatId, { sessionId, lastActivityAt }>
    this.sessions = new Map();

    // Cleanup périodique des sessions expirées (toutes les 5 minutes)
    this.cleanupInterval = setInterval(() => this._cleanupExpiredSessions(), 5 * 60 * 1000);

    logger.info({ timeoutMs: sessionTimeoutMs }, 'SessionManager initialized');
  }

  /**
   * Récupère ou crée une session pour un chat donné
   * @param {number} chatId - ID du chat Telegram
   * @returns {string} sessionId - ID de session (UUID)
   */
  getOrCreateSession(chatId) {
    const now = Date.now();
    const existingSession = this.sessions.get(chatId);

    // Si session existe et n'est pas expirée
    if (existingSession && now - existingSession.lastActivityAt < this.sessionTimeoutMs) {
      // Mettre à jour la dernière activité
      existingSession.lastActivityAt = now;
      logger.debug({ chatId, sessionId: existingSession.sessionId }, 'Session renewed');
      return existingSession.sessionId;
    }

    // Créer nouvelle session
    const sessionId = randomUUID();
    this.sessions.set(chatId, {
      sessionId,
      lastActivityAt: now,
    });

    logger.info({ chatId, sessionId }, 'New session created');
    return sessionId;
  }

  /**
   * Obtient la session actuelle d'un chat (sans en créer de nouvelle)
   * @param {number} chatId - ID du chat Telegram
   * @returns {string|null} sessionId ou null si aucune session active
   */
  getCurrentSession(chatId) {
    const now = Date.now();
    const existingSession = this.sessions.get(chatId);

    if (existingSession && now - existingSession.lastActivityAt < this.sessionTimeoutMs) {
      return existingSession.sessionId;
    }

    return null;
  }

  /**
   * Force la création d'une nouvelle session pour un chat
   * @param {number} chatId - ID du chat Telegram
   * @returns {string} sessionId - Nouvel ID de session
   */
  createNewSession(chatId) {
    const sessionId = randomUUID();
    this.sessions.set(chatId, {
      sessionId,
      lastActivityAt: Date.now(),
    });

    logger.info({ chatId, sessionId }, 'Session forcibly created');
    return sessionId;
  }

  /**
   * Termine une session pour un chat
   * @param {number} chatId - ID du chat Telegram
   */
  endSession(chatId) {
    const deleted = this.sessions.delete(chatId);
    if (deleted) {
      logger.info({ chatId }, 'Session ended');
    }
  }

  /**
   * Nettoie les sessions expirées du cache
   * @private
   */
  _cleanupExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [chatId, session] of this.sessions.entries()) {
      if (now - session.lastActivityAt >= this.sessionTimeoutMs) {
        this.sessions.delete(chatId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, 'Expired sessions cleaned up');
    }
  }

  /**
   * Obtient le nombre de sessions actives
   * @returns {number}
   */
  getActiveSessionCount() {
    return this.sessions.size;
  }

  /**
   * Nettoie toutes les sessions et arrête le cleanup périodique
   * À appeler lors de l'arrêt du serveur
   */
  shutdown() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
    logger.info('SessionManager shutdown');
  }
}
