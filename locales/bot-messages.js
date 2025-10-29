export const botMessages = {
  // Commande /start
  start: {
    greeting: '👋 Bonjour ! Je suis *ZoomChat*, votre assistant pour rechercher des annonces dans le *Zoom Hebdo*.',
    description: '📰 *Le Zoom Hebdo*, c\'est le journal N°1 des petites annonces au Gabon, publié chaque vendredi. Je vous aide à trouver rapidement ce que vous cherchez parmi des centaines d\'annonces.',
    canHelp: '🔍 *Je peux vous aider à trouver* :',
    categories: [
      '🏠 *Immobilier* - Appartements, maisons, terrains à vendre ou à louer',
      '🚗 *Véhicules* - Voitures, motos, engins à vendre',
      '💼 *Emploi* - Offres d\'emploi et candidatures',
      '📦 *Objets* - Meubles, électroménager, high-tech, vêtements...',
      '🤝 *People* - Annonces personnelles et services',
      '🏪 *Commerce* - Fonds de commerce à vendre ou à céder'
    ],
    howToUse: '💬 *Comment faire ?*\nTapez simplement ce que vous cherchez en quelques mots (ex: "appartement 3 chambres Owendo").',
    subscribe: '📬 *Nouveauté !* Abonnez-vous pour recevoir automatiquement le PDF complet chaque vendredi.',
    tryNow: '✨ Essayez maintenant ! Tapez ce que vous cherchez...'
  },

  // Commande /aide
  help: {
    title: 'ℹ️ *Aide - ZoomChat*',
    howToSearch: '🔎 *Comment rechercher une annonce ?*',
    searchDescription: 'Envoyez-moi un message décrivant ce que vous cherchez. Je parcourrai les annonces du Zoom Hebdo pour vous.',
    examplesTitle: '📝 *Exemples de recherches* :',
    examples: [
      '• appartement 3 chambres Owendo',
      '• voiture Toyota moins de 5 millions',
      '• emploi chauffeur permis CD',
      '• cherche nounou logée',
      '• terrain à vendre Ntoum',
      '• salon de coiffure à céder'
    ],
    categoriesTitle: '🏷️ *Catégories disponibles* :',
    categoriesList: '🏠 Immobilier - 🚗 Véhicules - 💼 Emploi\n📦 Objets - 🤝 People - 🏪 Commerce',
    commandsTitle: '📬 *Commandes disponibles* :',
    commands: [
      '• /dernier - Recevez le dernier PDF publié',
      '• /abonner - Recevez le PDF chaque vendredi automatiquement',
      '• /desabonner - Annulez votre abonnement'
    ]
  },

  // Commande /dernier
  dernier: {
    noParution: '❌ Aucune parution disponible pour le moment.\n\nLes nouvelles parutions seront disponibles chaque vendredi.',
    caption: (numero, periode) => `📰 *Zoom Hebdo N°${numero}*\n📅 ${periode}\n\n✅ Voici la dernière parution disponible !`,
    fileName: (numero) => `Zoom_Hebdo_${numero}.pdf`,
    error: '❌ Une erreur est survenue lors de l\'envoi du PDF.\n\nVeuillez réessayer dans quelques instants.'
  },

  // Commande /abonner
  subscribe: {
    alreadySubscribed: (date) =>
      `✅ Vous êtes déjà abonné aux notifications du Zoom Hebdo !\n\n` +
      `📅 Date d'abonnement : ${date}\n\n` +
      `Vous recevrez automatiquement le PDF chaque vendredi.`,
    success:
      '🎉 *Abonnement confirmé !*\n\n' +
      '✅ Vous recevrez désormais automatiquement le PDF du Zoom Hebdo chaque vendredi.\n\n' +
      '💡 Pour vous désabonner à tout moment, utilisez la commande /desabonner',
    error: '❌ Une erreur est survenue lors de l\'abonnement. Veuillez réessayer plus tard.'
  },

  // Commande /desabonner
  unsubscribe: {
    notSubscribed: '❌ Vous n\'êtes pas abonné aux notifications du Zoom Hebdo.',
    success:
      '✅ Désabonnement effectué avec succès.\n\n' +
      'Vous ne recevrez plus les PDF automatiquement.\n\n' +
      '📝 Pour vous réabonner, utilisez la commande /abonner',
    error: '❌ Une erreur est survenue lors du désabonnement. Veuillez réessayer plus tard.'
  },

  // Recherche
  search: {
    queryTooLong: (maxLength) => `⚠️ Votre recherche est trop longue (maximum ${maxLength} caractères).`,
    noResults: (query) => `❌ Aucune annonce trouvée pour: *${query}*\n\n💡 _Essayez avec des mots-clés différents_`,
    resultsTitle: (query) => `🔍 *Résultats pour:* "${query}"`,
    error: '❌ Une erreur est survenue. Veuillez réessayer plus tard.'
  },

  // Callback query
  callback: {
    subscribeButton: '📬 S\'abonner'
  }
};
