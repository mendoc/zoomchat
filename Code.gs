/**
 * Vérifie les nouveaux mails non lus.
 */
function checkNewEmails() {
  // Récupère les mails non lus dans la boîte de réception
  const threads = GmailApp.search('in:inbox from:no-reply@zoomhebdo.com is:unread');
  if (threads.length === 0) {
    Logger.log("Aucun mail à traiter.");
    return;
  }

  const thread = threads[0];
  const messages = thread.getMessages();

  messages.forEach(msg => {
    if (!msg.isUnread()) return;

    const htmlBody = msg.getBody(); // version HTML
    const urlMatch = htmlBody.match(/https?:\/\/[^\s"']*\/parution\/\d+/);

    if (!urlMatch) {
      Logger.log("Aucune URL /parution/ trouvée dans le mail.");
      msg.markRead();
      return;
    }

    const parutionUrl = urlMatch[0];
    Logger.log("URL extraite : " + parutionUrl);

    const parutionData = getParutionData(parutionUrl);
    if (!parutionData.pdfUrl) {
      Logger.log("Aucune URL de PDF trouvée.");
      msg.markRead();
      return;
    }

    // Configuration
    const botToken = "";
    const chatId = "";
    const caption = `Zoom Hebdo ${parutionData.numero} du ${parutionData.periode}`;
    const fileId = parutionData.pdfUrl.split("id=")[1] || '';
    const fileName = `ZOOM HEBDO ${parutionData.numero}_${fileId}.pdf`;

    // 1. Envoyer le PDF en blob au chat de test pour obtenir le file_id
    Logger.log("📤 Envoi du PDF au chat de test pour récupérer le file_id...");
    const telegramFileId = sendParutionPDF(parutionData.pdfUrl, botToken, chatId, caption, fileName);

    if (!telegramFileId) {
      Logger.log("❌ Impossible de récupérer le file_id Telegram");
      msg.markRead();
      return;
    }

    Logger.log(`✅ File ID récupéré: ${telegramFileId}`);

    // 2. Appeler la Cloud Function pour l'envoi en masse
    callMassNotifyFunction(parutionData.numero, parutionData.periode, parutionData.pdfUrl, telegramFileId, caption);

    // 3. Déclencher l'extraction des annonces
    triggerAnnouncesExtraction();

    // Marquer comme lu pour éviter de le retraiter
    msg.markRead();
  });
}

function getParutionData(parutionUrl) {
  // Récupération du contenu de la page
  const pageResponse = UrlFetchApp.fetch(parutionUrl);
  const pageHtml = pageResponse.getContentText();

  // Extraction des informations depuis la page
  const numeroMatch = pageHtml.match(/<strong[^>]*>(\d{3,4})<\/strong>/);
  const periodeMatch = pageHtml.match(/Semaine du\s*([\d/]+)\s*au\s*([\d/]+)/i);
  const pdfMatch = pageHtml.match(/https:\/\/www\.zoomhebdo\.com\/raw\/vue_fil\?id=\d+/);

  const numero = numeroMatch ? numeroMatch[1] : null;
  const periode = periodeMatch ? `${periodeMatch[1]} au ${periodeMatch[2]}` : null;
  const pdfUrl = pdfMatch ? pdfMatch[0] : null;

  Logger.log(`Numéro: ${numero}, Période: ${periode}, PDF: ${pdfUrl}`);

  return { numero, periode, pdfUrl };
}

/**
 * Envoie un PDF vers un bot Telegram et retourne le file_id
 * @param {string} pdfUrl - L'URL du PDF à envoyer
 * @param {string} botToken - Le token du bot Telegram
 * @param {string} chatId - L'ID du chat Telegram
 * @param {string} caption - (Optionnel) Légende du document
 * @param {string} fileName - (Optionnel) Nom du fichier
 * @return {string} File ID Telegram du document
 */
function sendParutionPDF(pdfUrl, botToken, chatId, caption = '', fileName = '') {
  try {
    // Récupérer le PDF depuis l'URL
    const response = UrlFetchApp.fetch(pdfUrl);
    const pdfBlob = response.getBlob();

    // Définir le nom du fichier
    if (fileName) {
      pdfBlob.setName(fileName);
    } else {
      pdfBlob.setName('document.pdf');
    }

    // Préparer l'URL de l'API Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendDocument`;

    // Préparer les données multipart/form-data
    const payload = {
      'chat_id': chatId,
      'document': pdfBlob
    };

    // Ajouter la légende si elle est fournie
    if (caption) {
      payload['caption'] = caption;
    }

    // Options de la requête
    const options = {
      'method': 'post',
      'payload': payload,
      'muteHttpExceptions': true
    };

    // Envoyer la requête
    const telegramResponse = UrlFetchApp.fetch(telegramApiUrl, options);
    const result = JSON.parse(telegramResponse.getContentText());

    // Vérifier le succès
    if (result.ok) {
      Logger.log('✅ PDF envoyé avec succès au chat de test !');

      // Extraire le file_id du document
      const fileId = result.result.document.file_id;
      Logger.log('📎 File ID: ' + fileId);

      return fileId;
    } else {
      Logger.log('❌ Erreur: ' + result.description);
      throw new Error('Erreur Telegram: ' + result.description);
    }

  } catch (error) {
    Logger.log('❌ Erreur lors de l\'envoi: ' + error.toString());
    throw error;
  }
}

/**
 * Appelle la Cloud Function pour l'envoi en masse
 * @param {string} numero - Numéro de la parution
 * @param {string} periode - Période de la parution
 * @param {string} pdfUrl - URL du PDF
 * @param {string} telegramFileId - File ID Telegram
 * @param {string} caption - Légende du document
 */
function callMassNotifyFunction(numero, periode, pdfUrl, telegramFileId, caption) {
  try {
    // Configuration
    const cloudFunctionUrl = "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/massNotify";
    const secretToken = "";

    // Préparer les données
    const payload = {
      numero: numero,
      periode: periode,
      pdfUrl: pdfUrl,
      telegramFileId: telegramFileId,
      caption: caption
    };

    // Options de la requête
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': {
        'Authorization': 'Bearer ' + secretToken
      },
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    Logger.log("📡 Appel de la Cloud Function pour l'envoi en masse...");

    // Appeler la Cloud Function
    const response = UrlFetchApp.fetch(cloudFunctionUrl, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      Logger.log(`✅ Envoi en masse réussi !`);
      Logger.log(`📊 Statistiques: ${result.stats.success}/${result.stats.total} réussis, ${result.stats.failed} échecs`);
    } else {
      Logger.log(`❌ Erreur lors de l'envoi en masse: ${result.error}`);
    }

    return result;

  } catch (error) {
    Logger.log('❌ Erreur lors de l\'appel de la Cloud Function: ' + error.toString());
    throw error;
  }
}

/**
 * Déclenche l'extraction des annonces depuis le PDF
 * Appelle l'endpoint /extract de Cloud Run
 */
function triggerAnnouncesExtraction() {
  try {
    // Configuration - Remplacer par l'URL réelle de Cloud Run
    const cloudRunUrl = "https://zoomchat-YOUR_SERVICE_ID-europe-west1.run.app/extract";

    // Options de la requête
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'muteHttpExceptions': true
    };

    Logger.log("🔍 Déclenchement de l'extraction des annonces...");

    // Appeler l'endpoint /extract
    const response = UrlFetchApp.fetch(cloudRunUrl, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      Logger.log(`✅ Extraction réussie !`);
      Logger.log(`📊 Parution N°${result.parution.numero} - ${result.parution.periode}`);
      Logger.log(`📝 ${result.stats.extraites} annonces extraites, ${result.stats.sauvegardees} sauvegardées`);
    } else {
      Logger.log(`❌ Erreur lors de l'extraction: ${result.error}`);
    }

    return result;

  } catch (error) {
    Logger.log('❌ Erreur lors de l\'appel de l\'extraction: ' + error.toString());
    throw error;
  }
}

