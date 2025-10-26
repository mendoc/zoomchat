import { Bot } from 'grammy';
import { addSubscriber, removeSubscriber, getSubscriber } from './database.js';

/**
 * Crée et configure le bot Telegram
 * @param {string} token - Le token du bot Telegram
 * @returns {Bot} Instance du bot configurée
 */
export function createBot(token) {
  const bot = new Bot(token);

  // Commande /start - Présentation du bot
  bot.command('start', async (ctx) => {
    const welcomeMessage = `
👋 Bonjour ! Je suis *ZoomChat*, votre assistant virtuel pour les petites annonces du *Zoom Hebdo* 🇬🇦

📰 *Le Zoom Hebdo*, c'est le journal N°1 d'annonces contrôlées au Gabon, publié chaque vendredi.

🔍 *Je peux vous aider à trouver* :
• 🏠 Immobilier (locations, ventes, terrains)
• 🚗 Véhicules (voitures, utilitaires)
• 💼 Emplois (offres d'emploi, formations)
• 📦 Objets (matériel, équipements)
• 🤝 Services et rencontres
• 🏪 Fonds de commerce

📋 *Commandes disponibles* :
/start - Afficher ce message
/aide - Obtenir de l'aide et exemples
/abonner - S'abonner aux notifications automatiques
/desabonner - Se désabonner des notifications

💬 *Comment chercher ?*
Envoyez-moi simplement ce que vous recherchez !
*Exemples :* "studio à louer Libreville", "Toyota occasion", "cherche ménagère"

📬 *Astuce* : Utilisez /abonner pour recevoir automatiquement le PDF chaque vendredi !
    `.trim();

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
  });

  // Commande /aide (remplace /help)
  bot.command('aide', async (ctx) => {
    const helpMessage = `
ℹ️ *Aide - ZoomChat*

🔎 *Comment rechercher une annonce ?*
Envoyez-moi un message décrivant ce que vous cherchez. Je parcourrai les annonces du Zoom Hebdo pour vous.

📝 *Exemples de recherches* :
• appartement 3 chambres Owendo
• voiture Toyota moins de 5 millions
• emploi chauffeur permis CD
• cherche nounou logée
• terrain à vendre Ntoum
• salon de coiffure à céder

🏷️ *Catégories disponibles* :
🏠 Immobilier - 🚗 Véhicules - 💼 Emploi
📦 Objets - 🤝 People - 🏪 Commerce

📬 *Abonnement automatique* :
• /abonner - Recevez le PDF chaque vendredi automatiquement
• /desabonner - Annulez votre abonnement
    `.trim();

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Commande /abonner - S'abonner aux publications automatiques
  bot.command('abonner', async (ctx) => {
    try {
      const chatId = ctx.chat.id;

      // Vérifier si l'utilisateur est déjà abonné
      const existingSubscriber = await getSubscriber(chatId);

      if (existingSubscriber && existingSubscriber.actif) {
        await ctx.reply(
          '✅ Vous êtes déjà abonné aux notifications du Zoom Hebdo !\n\n' +
          `📅 Date d'abonnement : ${new Date(existingSubscriber.date_abonnement).toLocaleDateString('fr-FR')}\n\n` +
          'Vous recevrez automatiquement le PDF chaque vendredi.'
        );
        return;
      }

      // Récupérer le nom de l'utilisateur depuis Telegram
      const nom = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Utilisateur';

      // Abonner l'utilisateur immédiatement (sans numéro de téléphone)
      await addSubscriber(chatId, nom, null);

      // Message de confirmation
      await ctx.reply(
        '🎉 *Abonnement confirmé !*\n\n' +
        `👤 Nom : ${nom}\n` +
        `📅 Date : ${new Date().toLocaleDateString('fr-FR')}\n\n` +
        '✅ Vous recevrez désormais le PDF du Zoom Hebdo automatiquement chaque vendredi.\n\n' +
        '💡 Pour vous désabonner, utilisez la commande /desabonner',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Erreur commande /abonner:', error);
      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  });

  // Commande /desabonner - Se désabonner des notifications
  bot.command('desabonner', async (ctx) => {
    try {
      const chatId = ctx.chat.id;

      // Vérifier si l'utilisateur est abonné
      const subscriber = await getSubscriber(chatId);

      if (!subscriber || !subscriber.actif) {
        await ctx.reply(
          '❌ Vous n\'êtes pas abonné aux notifications.\n\n' +
          'Utilisez /abonner pour vous abonner.'
        );
        return;
      }

      // Désactiver l'abonnement
      const success = await removeSubscriber(chatId);

      if (success) {
        await ctx.reply(
          '✅ Désabonnement effectué\n\n' +
          'Vous ne recevrez plus les notifications automatiques du Zoom Hebdo.\n\n' +
          '💡 Vous pouvez vous réabonner à tout moment avec la commande /abonner'
        );
      } else {
        await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur commande /desabonner:', error);
      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  });

  // Gestion des erreurs
  bot.catch((err) => {
    console.error('Erreur du bot:', err);
  });

  return bot;
}
