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
    stats: (totalActifs) => `📊 *Statistiques :*\n   • Total abonnés actifs : ${totalActifs}`,
  },

  extraction: {
    title: (status) => {
      const statusEmoji =
        status === 'complete_failure' ? '❌' : status === 'partial_success' ? '⚠️' : '✅';
      const statusText =
        status === 'complete_failure'
          ? 'ÉCHEC COMPLET'
          : status === 'partial_success'
            ? 'SUCCÈS PARTIEL'
            : 'SUCCÈS';
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
    saveStats: (extracted, saved, withoutRef) =>
      `💾 *Résultats d'extraction :*\n` +
      `   • 📄 Annonces extraites : ${extracted}\n` +
      `   • ✅ Sauvegardées en base : ${saved}\n` +
      `   • ⚠️ Sans référence (ignorées) : ${withoutRef}\n\n`,
    embeddingStats: (total, generated) =>
      `🔢 *Embeddings :*\n` +
      `   • Total annonces en base : ${total}\n` +
      `   • Nouveaux embeddings générés : ${generated}\n\n`,
    annoncesDetails: (categories) => {
      let message = `📋 *Détail par catégorie :*\n`;
      for (const [category, count] of Object.entries(categories)) {
        message += `   • ${category} : ${count}\n`;
      }
      return message;
    },
    footer: '✨ _Notification générée automatiquement_',
  },

  extractionFailure: {
    title: (isCompleteFailure) => {
      const emoji = isCompleteFailure ? '❌' : '⚠️';
      const text = isCompleteFailure ? 'ÉCHEC COMPLET' : 'ÉCHEC PARTIEL';
      return `🎯 *EXTRACTION ÉCHOUÉE* - ${emoji} ${text}\n\n`;
    },
    parutionInfo: (numero, periode, pdfUrl) =>
      `📰 *Parution :*\n` +
      `   • N° ${numero}\n` +
      `   • Période : ${periode}\n` +
      `   • URL : \`${pdfUrl}\`\n\n`,
    stats: (stats, duration) => {
      if (!stats) return '';
      const durationSec = (duration / 1000).toFixed(1);
      return (
        `📊 *Statistiques d'extraction :*\n` +
        `   • Pages traitées : ${stats.totalPages || 0}\n` +
        `   • ✅ Succès : ${stats.pagesSuccess || 0}\n` +
        `   • ❌ Erreurs : ${stats.pagesErrors || 0}\n` +
        `   • ⏱️ Durée : ${durationSec}s\n\n`
      );
    },
    error: (errorMessage) => `⚠️ *Erreur critique :*\n\`\`\`\n${errorMessage}\n\`\`\`\n\n`,
    footer: "⚠️ _Les abonnés ne recevront PAS le PDF tant que l'extraction n'aura pas réussi_",
  },

  massNotification: {
    successTitle: () => `📤 *ENVOI MASSIF TERMINÉ* - ✅ SUCCÈS\n\n`,
    failureTitle: () => `📤 *ENVOI MASSIF ÉCHOUÉ* - ❌ ÉCHEC\n\n`,
    parutionInfo: (numero, periode) =>
      `📰 *Parution :*\n` + `   • N° ${numero}\n` + `   • Période : ${periode}\n\n`,
    stats: (total, success, failed) =>
      `📊 *Statistiques d'envoi :*\n` +
      `   • 👥 Total abonnés : ${total}\n` +
      `   • ✅ Envois réussis : ${success}\n` +
      `   • ❌ Envois échoués : ${failed}\n` +
      `   • 📈 Taux de succès : ${total > 0 ? Math.round((success / total) * 100) : 0}%\n\n`,
    error: (errorMessage) => `⚠️ *Erreur critique :*\n\`\`\`\n${errorMessage}\n\`\`\`\n\n`,
    footer: '✨ _Notification générée automatiquement_',
  },

  notification: {
    configMissing: '⚠️ ADMIN_CHAT_ID non configuré - notification admin ignorée',
    sent: (action) => `✅ Notification admin envoyée pour ${action}`,
    error: (error) => `❌ Erreur lors de l'envoi de la notification admin: ${error}`,
  },
};
