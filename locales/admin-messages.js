export const adminMessages = {
  subscription: {
    title: (action, status) => {
      const actionEmoji = action === 'subscribe' ? '📥' : '📤';
      const actionText = action === 'subscribe' ? 'Nouvel abonnement' : 'Désabonnement';
      const statusEmoji = status === 'success' ? '✅' : '❌';
      const statusText = status === 'success' ? 'SUCCÈS' : 'ÉCHEC';
      return `${actionEmoji} *${actionText}* - ${statusEmoji} ${statusText}\n\n`;
    },
    userInfo: (nom, username, chatId, date) => {
      let message = `👤 *Utilisateur :*\n`;
      message += `   • Nom : ${nom}\n`;
      if (username) {
        message += `   • Username : @${username}\n`;
      }
      message += `   • Chat ID : \`${chatId}\`\n`;
      message += `   • Date : ${date}\n\n`;
      return message;
    },
    error: (errorMessage) => `⚠️ *Erreur :*\n${errorMessage}\n\n`,
    stats: (totalActifs) => `📊 *Statistiques :*\n   • Total abonnés actifs : ${totalActifs}`
  },

  extraction: {
    title: (status) => {
      const statusEmoji = status === 'complete_failure' ? '❌' :
                         status === 'partial_success' ? '⚠️' : '✅';
      const statusText = status === 'complete_failure' ? 'ÉCHEC COMPLET' :
                        status === 'partial_success' ? 'SUCCÈS PARTIEL' : 'SUCCÈS';
      return `🎯 *EXTRACTION TERMINÉE* - ${statusEmoji} ${statusText}\n\n`;
    },
    parutionInfo: (numero, periode, pdfUrl) =>
      `📰 *Parution :*\n` +
      `   • N° ${numero}\n` +
      `   • Période : ${periode}\n` +
      `   • URL : \`${pdfUrl}\`\n\n`,
    extractionStats: (total, success, errors, duration) =>
      `📊 *Statistiques d'extraction :*\n` +
      `   • Pages traitées : ${total}\n` +
      `   • ✅ Succès : ${success}\n` +
      `   • ❌ Erreurs : ${errors}\n` +
      `   • ⏱️ Durée : ${duration}s\n\n`,
    saveStats: (saved, errors) =>
      `💾 *Sauvegarde en base :*\n` +
      `   • ✅ Annonces sauvegardées : ${saved}\n` +
      `   • ❌ Erreurs de sauvegarde : ${errors}\n\n`,
    annoncesDetails: (categories) => {
      let message = `📋 *Détail par catégorie :*\n`;
      for (const [category, count] of Object.entries(categories)) {
        message += `   • ${category} : ${count}\n`;
      }
      return message;
    },
    footer: '✨ _Notification générée automatiquement_'
  },

  notification: {
    configMissing: '⚠️ ADMIN_CHAT_ID non configuré - notification admin ignorée',
    sent: (action) => `✅ Notification admin envoyée pour ${action}`,
    error: (error) => `❌ Erreur lors de l'envoi de la notification admin: ${error}`
  }
};
