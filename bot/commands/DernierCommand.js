import { botMessages } from '../../locales/bot-messages.js';
import { logger } from '../../shared/logger.js';

/**
 * Commande /dernier - Envoie le dernier PDF publié
 */
export class DernierCommand {
  /**
   * @param {ParutionRepository} parutionRepo
   */
  constructor(parutionRepo) {
    this.parutionRepo = parutionRepo;
  }

  /**
   * Gère la commande /dernier
   * @param {Context} ctx - Contexte grammy
   */
  async handle(ctx) {
    const chatId = ctx.chat.id;

    try {
      logger.info({ chatId }, 'Commande /dernier reçue');

      // Récupérer la dernière parution
      const parution = await this.parutionRepo.getLatest();

      if (!parution || !parution.telegramFileId) {
        await ctx.reply(botMessages.dernier.noParution);
        logger.info({ chatId }, 'Aucune parution disponible');
        return;
      }

      // Préparer la légende
      const caption = botMessages.dernier.caption(
        parution.numero,
        parution.periode
      );

      // Envoyer le document
      await ctx.replyWithDocument(parution.telegramFileId, {
        caption,
        parse_mode: 'Markdown',
        filename: botMessages.dernier.fileName(parution.numero)
      });

      logger.info(
        { chatId, numero: parution.numero },
        'Dernier PDF envoyé'
      );

    } catch (error) {
      logger.error({ err: error, chatId }, 'Erreur lors de /dernier');
      await ctx.reply(botMessages.dernier.error);
    }
  }
}
