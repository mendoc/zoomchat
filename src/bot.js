import { Bot } from 'grammy';
import { addSubscriber, removeSubscriber, getSubscriber, getAllActiveSubscribers, searchAnnonces } from './database.js';

/**
 * Envoie une notification à l'administrateur lors d'une action d'abonnement/désabonnement
 * @param {Bot} bot - Instance du bot Telegram
 * @param {string} action - Type d'action : 'subscribe' ou 'unsubscribe'
 * @param {object} userData - Informations sur l'utilisateur
 * @param {string} userData.nom - Nom de l'utilisateur
 * @param {string} userData.username - Username Telegram (optionnel)
 * @param {number} userData.chatId - ID du chat
 * @param {Date} userData.date - Date de l'action
 * @param {string|null} error - Message d'erreur si l'action a échoué
 */
async function notifyAdmin(bot, action, userData, error = null) {
  const adminChatId = process.env.ADMIN_CHAT_ID;

  // Si ADMIN_CHAT_ID n'est pas configuré, ne pas envoyer de notification
  if (!adminChatId) {
    console.log('⚠️ ADMIN_CHAT_ID non configuré - notification admin ignorée');
    return;
  }

  try {
    // Récupérer le nombre total d'abonnés actifs
    const activeSubscribers = await getAllActiveSubscribers();
    const totalActifs = activeSubscribers.length;

    // Déterminer l'emoji et le texte de l'action
    const actionEmoji = action === 'subscribe' ? '📥' : '📤';
    const actionText = action === 'subscribe' ? 'Nouvel abonnement' : 'Désabonnement';
    const statusEmoji = error ? '❌' : '✅';
    const statusText = error ? 'ÉCHEC' : 'SUCCÈS';

    // Construire le message
    let message = `${actionEmoji} *${actionText}* - ${statusEmoji} ${statusText}\n\n`;

    message += `👤 *Utilisateur :*\n`;
    message += `   • Nom : ${userData.nom}\n`;
    if (userData.username) {
      message += `   • Username : @${userData.username}\n`;
    }
    message += `   • Chat ID : \`${userData.chatId}\`\n`;
    message += `   • Date : ${userData.date.toLocaleString('fr-FR')}\n\n`;

    if (error) {
      message += `⚠️ *Erreur :*\n${error}\n\n`;
    }

    message += `📊 *Statistiques :*\n`;
    message += `   • Total abonnés actifs : ${totalActifs}`;

    // Envoyer la notification à l'admin
    await bot.api.sendMessage(adminChatId, message, {
      parse_mode: 'Markdown'
    });

    console.log(`✅ Notification admin envoyée pour ${actionText}`);
  } catch (notifyError) {
    // Ne pas bloquer le flux principal si la notification échoue
    console.error('❌ Erreur lors de l\'envoi de la notification admin:', notifyError);
  }
}

/**
 * Crée et configure le bot Telegram
 * @param {string} token - Le token du bot Telegram
 * @returns {Bot} Instance du bot configurée
 */
export function createBot(token) {
  const bot = new Bot(token);

  // Commande /start - Présentation du bot
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;

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

💬 *Comment ça marche ?*
Envoyez-moi simplement votre recherche en message et je parcourrai toutes les annonces pour vous !

*Exemples de recherches :*
• "studio à louer Libreville"
• "Toyota occasion"
• "cherche ménagère"
• "terrain à vendre Ntoum"
• "emploi chauffeur"

📋 *Commandes utiles* :
/aide - Voir plus d'exemples
/abonner - Recevoir le PDF chaque vendredi
/desabonner - Annuler l'abonnement

✨ Essayez maintenant ! Tapez ce que vous cherchez...
    `.trim();

    // Vérifier si l'utilisateur est abonné
    const subscriber = await getSubscriber(chatId);
    const isSubscribed = subscriber && subscriber.actif;

    // Afficher le bouton S'abonner uniquement si l'utilisateur n'est pas abonné
    const replyMarkup = isSubscribed ? {} : {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📬 S\'abonner', callback_data: 'subscribe' }]
        ]
      }
    };

    await ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      ...replyMarkup
    });
  });

  // Commande /aide (remplace /help)
  bot.command('aide', async (ctx) => {
    const chatId = ctx.chat.id;

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

    // Vérifier si l'utilisateur est abonné
    const subscriber = await getSubscriber(chatId);
    const isSubscribed = subscriber && subscriber.actif;

    // Afficher le bouton S'abonner uniquement si l'utilisateur n'est pas abonné
    const replyMarkup = isSubscribed ? {} : {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📬 S\'abonner', callback_data: 'subscribe' }]
        ]
      }
    };

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown',
      ...replyMarkup
    });
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

      // Notifier l'admin du nouvel abonnement
      await notifyAdmin(bot, 'subscribe', {
        nom,
        username: ctx.from.username,
        chatId,
        date: new Date()
      });

      // Message de confirmation
      await ctx.reply(
        '🎉 *Abonnement confirmé !*\n\n' +
        `👤 Nom : ${nom}\n` +
        `📅 Date : ${new Date().toLocaleDateString('fr-FR')}\n\n` +
        '✅ Vous recevrez désormais le PDF du Zoom Hebdo automatiquement chaque vendredi.\n\n' +
        '💡 Pour vous désabonner, utilisez la commande /desabonner',
        {
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        }
      );
    } catch (error) {
      console.error('Erreur commande /abonner:', error);

      // Notifier l'admin de l'erreur
      const nom = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Utilisateur';
      await notifyAdmin(bot, 'subscribe', {
        nom,
        username: ctx.from.username,
        chatId,
        date: new Date()
      }, error.message);

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

      // Récupérer le nom de l'utilisateur depuis Telegram
      const nom = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Utilisateur';

      // Désactiver l'abonnement
      const success = await removeSubscriber(chatId);

      if (success) {
        // Notifier l'admin du désabonnement
        await notifyAdmin(bot, 'unsubscribe', {
          nom,
          username: ctx.from.username,
          chatId,
          date: new Date()
        });

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

      // Notifier l'admin de l'erreur
      const nom = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Utilisateur';
      await notifyAdmin(bot, 'unsubscribe', {
        nom,
        username: ctx.from.username,
        chatId,
        date: new Date()
      }, error.message);

      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  });

  // Gestionnaire du bouton "S'abonner"
  bot.callbackQuery('subscribe', async (ctx) => {
    try {
      await ctx.answerCallbackQuery(); // Répondre au callback pour enlever l'indicateur de chargement

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

      // Notifier l'admin du nouvel abonnement
      await notifyAdmin(bot, 'subscribe', {
        nom,
        username: ctx.from.username,
        chatId,
        date: new Date()
      });

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
      console.error('Erreur callback subscribe:', error);

      // Notifier l'admin de l'erreur
      const nom = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'Utilisateur';
      await notifyAdmin(bot, 'subscribe', {
        nom,
        username: ctx.from.username,
        chatId,
        date: new Date()
      }, error.message);

      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  });

  // Handler pour les messages texte - Recherche d'annonces
  bot.on('message:text', async (ctx) => {
    try {
      const query = ctx.message.text;

      // Ignorer les commandes (déjà gérées par les handlers de commande)
      if (query.startsWith('/')) {
        return;
      }

      // Limiter la taille du message pour éviter les abus
      if (query.length > 200) {
        await ctx.reply(
          '⚠️ Votre recherche est trop longue.\n\n' +
          'Veuillez limiter votre recherche à 200 caractères maximum.'
        );
        return;
      }

      // Afficher un indicateur de saisie
      await ctx.replyWithChatAction('typing');

      console.log(`🔍 Recherche pour "${query}"`);

      // Effectuer la recherche (limité à 10 résultats)
      const resultats = await searchAnnonces(query, 10);

      if (resultats.length === 0) {
        await ctx.reply(
          '😔 *Aucune annonce trouvée*\n\n' +
          `Je n'ai pas trouvé d'annonces correspondant à "${query}".\n\n` +
          '💡 *Conseils* :\n' +
          '• Essayez avec des mots-clés plus simples\n' +
          '• Vérifiez l\'orthographe\n' +
          '• Utilisez des termes génériques (ex: "studio" au lieu de "studio meublé avec piscine")',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      // Formater les résultats
      let response = `🔍 *${resultats.length} annonce${resultats.length > 1 ? 's' : ''} trouvée${resultats.length > 1 ? 's' : ''}*\n`;
      response += `📝 Recherche : "${query}"\n\n`;
      response += '─────────────────────\n\n';

      resultats.forEach((annonce, index) => {
        // Tronquer le texte si trop long
        const texte = annonce.texte_complet.length > 200
          ? annonce.texte_complet.substring(0, 200) + '...'
          : annonce.texte_complet;

        response += `${index + 1}. ${annonce.categorie ? `*[${annonce.categorie}]*` : ''}\n`;
        response += `${texte}\n`;

        if (annonce.telephone) {
          response += `📞 ${annonce.telephone}\n`;
        }
        if (annonce.prix) {
          response += `💰 ${annonce.prix}\n`;
        }

        response += '\n';
      });

      // Si plus de résultats disponibles
      if (resultats.length === 10) {
        response += '💡 _Seuls les 10 premiers résultats sont affichés. Affinez votre recherche pour des résultats plus précis._';
      }

      await ctx.reply(response, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('Erreur recherche annonces:', error);
      await ctx.reply(
        '❌ Une erreur est survenue lors de la recherche.\n\n' +
        'Veuillez réessayer dans quelques instants.'
      );
    }
  });

  // Gestion des erreurs
  bot.catch((err) => {
    console.error('Erreur du bot:', err);
  });

  return bot;
}
