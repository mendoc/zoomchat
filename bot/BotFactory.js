import { Bot } from 'grammy';
import { logger } from '../shared/logger.js';

import { StartCommand } from './commands/StartCommand.js';
import { AideCommand } from './commands/AideCommand.js';
import { DernierCommand } from './commands/DernierCommand.js';
import { AbonnerCommand } from './commands/AbonnerCommand.js';
import { DesabonnerCommand } from './commands/DesabonnerCommand.js';

import { TextHandler } from './handlers/TextHandler.js';
import { CallbackHandler } from './handlers/CallbackHandler.js';

/**
 * Factory pour créer et configurer l'instance du bot Telegram
 */
export class BotFactory {
  /**
   * Crée et configure une instance du bot
   * @param {string} token - Token du bot Telegram
   * @param {object} dependencies - Dépendances nécessaires
   * @param {SubscriberRepository} dependencies.subscriberRepo
   * @param {ParutionRepository} dependencies.parutionRepo
   * @param {VectorSearchService} dependencies.vectorSearchService
   * @param {AdminNotifier} dependencies.adminNotifier
   * @returns {Bot} Instance du bot configurée
   */
  static create(token, dependencies) {
    const {
      subscriberRepo,
      parutionRepo,
      vectorSearchService,
      adminNotifier
    } = dependencies;

    // Créer l'instance du bot
    const bot = new Bot(token);

    logger.info('Initialisation du bot Telegram');

    // Instancier les commandes
    const startCommand = new StartCommand(subscriberRepo);
    const aideCommand = new AideCommand(subscriberRepo);
    const dernierCommand = new DernierCommand(parutionRepo, subscriberRepo);
    const abonnerCommand = new AbonnerCommand(subscriberRepo, adminNotifier);
    const desabonnerCommand = new DesabonnerCommand(subscriberRepo, adminNotifier);

    // Instancier les handlers
    const textHandler = new TextHandler(vectorSearchService, subscriberRepo);
    const callbackHandler = new CallbackHandler(subscriberRepo, adminNotifier);

    // Enregistrer les commandes
    bot.command('start', (ctx) => startCommand.handle(ctx));
    bot.command('aide', (ctx) => aideCommand.handle(ctx));
    bot.command('help', (ctx) => aideCommand.handle(ctx));
    bot.command('dernier', (ctx) => dernierCommand.handle(ctx));
    bot.command('abonner', (ctx) => abonnerCommand.handle(ctx));
    bot.command('desabonner', (ctx) => desabonnerCommand.handle(ctx));

    logger.info('Commandes du bot enregistrées');

    // Enregistrer le handler de texte (recherche)
    bot.on('message:text', (ctx) => {
      // Ignorer les messages qui sont des commandes
      if (ctx.message.text.startsWith('/')) {
        return;
      }
      return textHandler.handle(ctx);
    });

    logger.info('Handler de texte enregistré');

    // Enregistrer le handler de callback queries
    bot.on('callback_query:data', (ctx) => callbackHandler.handle(ctx));

    logger.info('Handler de callback queries enregistré');

    // Middleware de gestion d'erreurs
    bot.catch((err) => {
      const ctx = err.ctx;
      logger.error(
        {
          err: err.error,
          update: ctx.update,
          chatId: ctx.chat?.id
        },
        'Erreur non gérée dans le bot'
      );

      // Tenter d'envoyer un message d'erreur à l'utilisateur
      if (ctx.chat) {
        ctx.reply('❌ Une erreur inattendue est survenue. Veuillez réessayer.')
          .catch((replyErr) => {
            logger.error(
              { err: replyErr },
              'Impossible d\'envoyer le message d\'erreur à l\'utilisateur'
            );
          });
      }
    });

    logger.info('Middleware d\'erreur enregistré');

    logger.info('Bot Telegram configuré avec succès');

    return bot;
  }
}
