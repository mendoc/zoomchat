import { Bot } from 'grammy';

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
👋 Bonjour ! Je suis **ZoomChat**, votre assistant virtuel pour les petites annonces du **Zoom Hebdo** 🇬🇦

📰 **Le Zoom Hebdo**, c'est le journal N°1 d'annonces contrôlées au Gabon, publié chaque vendredi.

🔍 **Je peux vous aider à trouver** :
• 🏠 Immobilier (locations, ventes, terrains)
• 🚗 Véhicules (voitures, utilitaires)
• 💼 Emplois (offres d'emploi, formations)
• 📦 Objets (matériel, équipements)
• 🤝 Services et rencontres
• 🏪 Fonds de commerce

📋 **Commandes disponibles** :
/start - Afficher ce message
/aide - Obtenir de l'aide et exemples

💬 **Comment chercher ?**
Envoyez-moi simplement ce que vous recherchez !
*Exemples :* "studio à louer Libreville", "Toyota occasion", "cherche ménagère"
    `.trim();

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
  });

  // Commande /aide (remplace /help)
  bot.command('aide', async (ctx) => {
    const helpMessage = `
ℹ️ **Aide - ZoomChat**

🔎 **Comment rechercher une annonce ?**
Envoyez-moi un message décrivant ce que vous cherchez. Je parcourrai les annonces du Zoom Hebdo pour vous.

📝 **Exemples de recherches** :
• "appartement 3 chambres Owendo"
• "voiture Toyota moins de 5 millions"
• "emploi chauffeur permis CD"
• "cherche nounou logée"
• "terrain à vendre Ntoum"
• "salon de coiffure à céder"

🏷️ **Catégories disponibles** :
🏠 Immobilier - 🚗 Véhicules - 💼 Emploi
📦 Objets - 🤝 People - 🏪 Commerce
    `.trim();

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Gestion des erreurs
  bot.catch((err) => {
    console.error('Erreur du bot:', err);
  });

  return bot;
}
