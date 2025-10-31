import { InlineKeyboard } from 'grammy'; 
import { botMessages } from '../../locales/bot-messages.js';
import { TELEGRAM_CONFIG } from '../../shared/config/constants.js';
import { logger } from '../../shared/logger.js';

/**
 * Handler pour les messages texte (recherche)
 */
export class TextHandler {
  /**
   * @param {VectorSearchService} vectorSearchService
   * @param {SubscriberRepository} subscriberRepo
   */
  constructor(vectorSearchService, subscriberRepo) {
    this.vectorSearchService = vectorSearchService;
    this.subscriberRepo = subscriberRepo;
  }

  /**
   * Gère la réception d'un message texte.
   * Répond immédiatement et lance la recherche en arrière-plan.
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const query = ctx.message.text;
    const chatId = ctx.chat.id;
    const user = ctx.from;

    logger.info({ chatId, query }, 'Recherche reçue');

    // Enregistre l'utilisateur s'il n'existe pas
    await this.subscriberRepo.findOrCreate(chatId, {
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
    });

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
        let messageText = result.message;

        // Échapper les caractères HTML de base pour éviter les conflits
        if (messageText) {
            messageText = messageText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }

        const options = {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        };

        // Extraire le premier numéro de téléphone de l'annonce
        const phoneMatch = messageText.match(/0[67][\d\s.-]{7,}/);

        if (phoneMatch) {
          const originalNumberText = phoneMatch[0];
          let phoneNumber = originalNumberText.replace(/[\s.-]/g, '');
          if (phoneNumber.startsWith('0')) {
            phoneNumber = `+241${phoneNumber.substring(1)}`;
          }
          
          const link = `<a href="tel:${phoneNumber}">${originalNumberText}</a>`;
          messageText = messageText.replace(originalNumberText, link);
        }
        messageText += ` <a href="https://google.com">Google</a>`;
        messageText += ` <a href="tel:+24174213803">074 21 38 03</a>`;

        try {
          // Tenter d'envoyer avec le formatage HTML
          await ctx.reply(messageText, options);
        } catch (htmlError) {
          logger.warn(
            { err: htmlError, chatId, query },
            'Échec de l\'envoi en HTML, nouvelle tentative en texte brut'
          );
          try {
            // En cas d'échec, envoyer en texte brut
            delete options.parse_mode;
            // Le message doit être la version non échappée
            await ctx.reply(result.message, options);
          } catch (plainTextError) {
            logger.error(
              { err: plainTextError, chatId, query },
              'Échec de l\'envoi même en texte brut'
            );
          }
        }

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
