import { logger } from '../../shared/logger.js';

/**
 * Middleware grammy pour logger automatiquement toutes les interactions avec le bot
 * Enregistre les messages utilisateur et les réponses du bot dans la base de données
 */
export class ConversationLogger {
  constructor(conversationRepo, subscriberRepo, sessionManager) {
    this.conversationRepo = conversationRepo;
    this.subscriberRepo = subscriberRepo;
    this.sessionManager = sessionManager;
  }

  /**
   * Middleware pour logger les interactions utilisateur
   * À appeler AVANT les handlers dans BotFactory
   * @returns {Function} Middleware grammy
   */
  logUserInteraction() {
    return async (ctx, next) => {
      try {
        const chatId = ctx.chat?.id;
        const user = ctx.from;

        // Ignorer si pas de chat ou utilisateur
        if (!chatId || !user) {
          return next();
        }

        // Trouver ou créer le subscriber
        let subscriber = await this.subscriberRepo.getByChatId(chatId);

        if (!subscriber) {
          const userData = {
            nom: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
            telephone: null, // Ne sera renseigné que lors de l'abonnement
          };
          subscriber = await this.subscriberRepo.create(chatId, userData);
        }

        // Obtenir ou créer une session
        const sessionId = this.sessionManager.getOrCreateSession(chatId);

        // Déterminer le type d'interaction
        let interactionType = 'unknown';
        const interactionData = {
          subscriberId: subscriber.id,
          chatId: chatId,
          sessionId: sessionId,
          metadata: {
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
          },
        };

        // Traiter selon le type de message
        if (ctx.message?.text) {
          interactionData.messageId = ctx.message.message_id;
          interactionData.messageText = ctx.message.text;

          if (ctx.message.text.startsWith('/')) {
            // C'est une commande
            interactionType = 'command';
            interactionData.commandName = ctx.message.text.split(' ')[0].substring(1);
          } else {
            // C'est une requête de recherche textuelle
            interactionType = 'text_query';
            interactionData.searchQuery = ctx.message.text;
          }
        } else if (ctx.callbackQuery) {
          // C'est un callback query (bouton inline)
          interactionType = 'callback_query';
          interactionData.callbackData = ctx.callbackQuery.data;
          interactionData.messageId = ctx.callbackQuery.message?.message_id;
        }

        interactionData.interactionType = interactionType;

        // Logger l'interaction (async, non-bloquant)
        const conversation = await this.conversationRepo.logInteraction(interactionData);

        // Initialiser ctx.state si nécessaire et stocker conversationId
        if (!ctx.state) {
          ctx.state = {};
        }
        ctx.state.conversationId = conversation.id;
        ctx.state.chatId = chatId;

        logger.debug(
          { chatId, interactionType, conversationId: conversation.id },
          'User interaction logged'
        );
      } catch (error) {
        // Ne pas bloquer le bot en cas d'erreur de logging
        logger.error({ err: error, chatId: ctx.chat?.id }, 'Error logging user interaction');
      }

      // Passer au handler suivant
      return next();
    };
  }

  /**
   * Middleware pour logger les réponses du bot
   * Intercepte les méthodes de réponse de ctx
   * À appeler APRÈS logUserInteraction mais AVANT les handlers
   * @returns {Function} Middleware grammy
   */
  logBotResponse() {
    return async (ctx, next) => {
      // Sauvegarder les méthodes originales
      const originalReply = ctx.reply.bind(ctx);
      const originalReplyWithDocument = ctx.replyWithDocument?.bind(ctx);
      const originalAnswerCallbackQuery = ctx.answerCallbackQuery?.bind(ctx);
      const originalEditMessageText = ctx.editMessageText?.bind(ctx);

      // Wrapper pour ctx.reply()
      ctx.reply = async (...args) => {
        const sentMessage = await originalReply(...args);
        await this._logResponse(ctx, sentMessage, 'text', args[0]);
        return sentMessage;
      };

      // Wrapper pour ctx.replyWithDocument()
      if (originalReplyWithDocument) {
        ctx.replyWithDocument = async (...args) => {
          const sentMessage = await originalReplyWithDocument(...args);
          await this._logResponse(
            ctx,
            sentMessage,
            'document',
            args[1]?.caption || 'Document envoyé'
          );
          return sentMessage;
        };
      }

      // Wrapper pour ctx.answerCallbackQuery()
      if (originalAnswerCallbackQuery) {
        ctx.answerCallbackQuery = async (...args) => {
          const result = await originalAnswerCallbackQuery(...args);
          await this._logResponse(ctx, null, 'callback_answer', args[0]);
          return result;
        };
      }

      // Wrapper pour ctx.editMessageText()
      if (originalEditMessageText) {
        ctx.editMessageText = async (...args) => {
          const result = await originalEditMessageText(...args);
          await this._logResponse(ctx, result, 'text', args[0]);
          return result;
        };
      }

      // Passer au handler suivant
      await next();
    };
  }

  /**
   * Méthode helper pour logger une réponse
   * @private
   */
  async _logResponse(ctx, sentMessage, responseType, responseText) {
    try {
      const conversationId = ctx.state.conversationId;
      const chatId = ctx.state.chatId;

      if (!conversationId || !chatId) {
        logger.warn('Missing conversationId or chatId in ctx.state, skipping bot response logging');
        return;
      }

      const responseData = {
        conversationId: conversationId,
        chatId: chatId,
        responseMessageId: sentMessage?.message_id || null,
        responseText:
          typeof responseText === 'string' ? responseText : JSON.stringify(responseText),
        responseType: responseType,
      };

      // Ajouter metadata si nécessaire
      if (sentMessage) {
        responseData.metadata = {
          replyToMessageId: sentMessage.reply_to_message?.message_id,
        };
      }

      // Logger la réponse (async fire-and-forget)
      await this.conversationRepo.logBotResponse(responseData);

      logger.debug({ chatId, conversationId, responseType }, 'Bot response logged');
    } catch (error) {
      logger.error({ err: error }, 'Error logging bot response');
    }
  }

  /**
   * Crée un middleware composé qui applique les deux middlewares
   * @returns {Function} Middleware grammy composé
   */
  middleware() {
    return (ctx, next) => this.logUserInteraction()(ctx, () => this.logBotResponse()(ctx, next));
  }
}
