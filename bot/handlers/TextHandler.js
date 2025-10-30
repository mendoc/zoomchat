import { botMessages } from '../../locales/bot-messages.js';
import { TELEGRAM_CONFIG } from '../../shared/config/constants.js';
import { logger } from '../../shared/logger.js';

/**
 * Handler pour les messages texte (recherche)
 */
export class TextHandler {
  /**
   * @param {VectorSearchService} vectorSearchService
   */
  constructor(vectorSearchService) {
    this.vectorSearchService = vectorSearchService;
  }

  /**
   * Gère la réception d'un message texte.
   * Répond immédiatement et lance la recherche en arrière-plan.
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const query = ctx.message.text;
    const chatId = ctx.chat.id;

    logger.info({ chatId, query }, 'Recherche reçue');

    // Validation de la longueur
    if (query.length > TELEGRAM_CONFIG.MAX_QUERY_LENGTH) {
      await ctx.reply(botMessages.search.queryTooLong(TELEGRAM_CONFIG.MAX_QUERY_LENGTH));
      return;
    }

    // 1. Envoyer un message d'attente immédiatement
    await ctx.reply(botMessages.search.searching);

    // 2. Lancer la recherche en arrière-plan sans attendre (fire-and-forget)
    this._performSearchAndReply(ctx, query);
  }

  /**
   * Exécute la recherche et envoie les résultats.
   * Cette méthode est conçue pour être appelée sans `await`.
   * @param {Context} ctx - Contexte grammy
   * @param {string} query - La requête de recherche
   * @private
   */
  async _performSearchAndReply(ctx, query) {
    const chatId = ctx.chat.id;
    try {
      // 3. Effectuer la recherche (opération longue)
      const results = await this.vectorSearchService.search(query);

      if (results.length === 0) {
        await ctx.reply(botMessages.search.noResults(query), {
          parse_mode: 'Markdown'
        });
        logger.info({ chatId, query }, 'Aucun résultat trouvé');
        return;
      }

      // 4. Envoyer les résultats
      const header = botMessages.search.resultsTitle(query) + `\n_${results.length} annonce(s) trouvée(s)_\n\n`;
      await ctx.reply(header, { parse_mode: 'Markdown' });

      for (const result of results) {
        await ctx.reply(result.message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        // Petite pause pour ne pas spammer l'API Telegram
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      logger.info(
        { chatId, query, resultsCount: results.length },
        'Résultats envoyés'
      );

    } catch (error) {
      logger.error({ err: error, chatId, query }, 'Erreur lors de la recherche en arrière-plan');
      // Envoyer un message d'erreur à l'utilisateur
      await ctx.reply(botMessages.search.error);
    }
  }
}
