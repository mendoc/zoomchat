import { botMessages } from '../../locales/bot-messages.js';
import { TELEGRAM_CONFIG } from '../../shared/config/constants.js';
import { logger } from '../../shared/logger.js';

/**
 * Handler pour les messages texte (recherche)
 */
export class TextHandler {
  /**
   * @param {HybridSearchService} hybridSearchService
   */
  constructor(hybridSearchService) {
    this.hybridSearchService = hybridSearchService;
  }

  /**
   * Gère les messages texte
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const query = ctx.message.text;
    const chatId = ctx.chat.id;

    try {
      logger.info({ chatId, query }, 'Recherche reçue');

      // Validation de la longueur
      if (query.length > TELEGRAM_CONFIG.MAX_QUERY_LENGTH) {
        await ctx.reply(botMessages.search.queryTooLong(TELEGRAM_CONFIG.MAX_QUERY_LENGTH));
        return;
      }

      // Effectuer la recherche
      const results = await this.hybridSearchService.search(query);

      if (results.length === 0) {
        await ctx.reply(botMessages.search.noResults(query), {
          parse_mode: 'Markdown'
        });
        logger.info({ chatId, query }, 'Aucun résultat trouvé');
        return;
      }

      // Envoyer les résultats
      const header = botMessages.search.resultsTitle(query) + `\n_${results.length} annonce(s) trouvée(s)_\n\n`;
      await ctx.reply(header, { parse_mode: 'Markdown' });

      // Envoyer chaque résultat séparément
      for (const result of results) {
        await ctx.reply(result.message, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });

        // Petite pause entre chaque message
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      logger.info(
        { chatId, query, resultsCount: results.length },
        'Résultats envoyés'
      );

    } catch (error) {
      logger.error({ err: error, chatId, query }, 'Erreur lors de la recherche');
      await ctx.reply(botMessages.search.error);
    }
  }
}
