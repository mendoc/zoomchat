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

    const botToken = "2057473326:AAEGNVpQzwhTkXXTLaihKHz8ko-u76h_noE";
    const chatId = "1909919492";
    const caption = `Zoom Hebdo ${parutionData.numero} du ${parutionData.periode}`;
    const fileId = parutionData.pdfUrl.split("id=")[1] || '';
    const fileName = `ZOOM HEBDO ${parutionData.numero}_${fileId}.pdf`;

    sendParutionPDF(parutionData.pdfUrl, botToken, chatId, caption, fileName);

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
 * Envoie un PDF vers un bot Telegram
 * @param {string} pdfUrl - L'URL du PDF à envoyer
 * @param {string} botToken - Le token du bot Telegram
 * @param {string} chatId - L'ID du chat Telegram
 * @param {string} caption - (Optionnel) Légende du document
 * @return {object} Réponse de l'API Telegram
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
      Logger.log('PDF envoyé avec succès !');
      return result;
    } else {
      Logger.log('Erreur: ' + result.description);
      throw new Error('Erreur Telegram: ' + result.description);
    }

  } catch (error) {
    Logger.log('Erreur lors de l\'envoi: ' + error.toString());
    throw error;
  }
}

