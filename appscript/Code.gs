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

    // Configuration - URL du serveur Cloud Run
    const serverUrl = "https://zoomchat.ongoua.pro";

    // 1. Enregistrer la parution dans la base de données
    Logger.log("📝 Enregistrement de la parution...");
    const dateParution = msg.getDate().toISOString(); // Date de réception de l'email
    const parutionRegistered = registerParution(serverUrl, parutionData.numero, parutionData.periode, parutionData.pdfUrl, dateParution);

    if (!parutionRegistered) {
      Logger.log("❌ Échec de l'enregistrement de la parution");
      msg.markRead();
      return;
    }

    Logger.log(`✅ Parution N°${parutionData.numero} enregistrée`);

    // 2. Déclencher l'extraction (fire-and-forget)
    // Le serveur gérera automatiquement l'envoi massif en cas de succès
    Logger.log("🔍 Déclenchement de l'extraction des annonces...");
    triggerExtraction(serverUrl, parutionData.numero);

    Logger.log("✅ Processus déclenché. Le serveur gérera l'extraction et l'envoi automatiquement.");

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
 * Enregistre une nouvelle parution dans la base de données
 * @param {string} serverUrl - URL du serveur Cloud Run
 * @param {string} numero - Numéro de la parution
 * @param {string} periode - Période de la parution
 * @param {string} pdfUrl - URL du PDF
 * @param {string} dateParution - Date de réception de l'email (ISO 8601)
 * @return {boolean} true si succès, false sinon
 */
function registerParution(serverUrl, numero, periode, pdfUrl, dateParution) {
  try {
    const url = `${serverUrl}/parution`;

    const payload = {
      numero: numero,
      periode: periode,
      pdfUrl: pdfUrl,
      dateParution: dateParution
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      Logger.log(`✅ Parution enregistrée: ID ${result.parution.id}`);
      return true;
    } else {
      Logger.log(`❌ Erreur lors de l'enregistrement: ${result.error || 'Erreur inconnue'}`);
      return false;
    }

  } catch (error) {
    Logger.log('❌ Erreur lors de l\'enregistrement de la parution: ' + error.toString());
    return false;
  }
}

/**
 * Déclenche l'extraction des annonces depuis le PDF
 * Le serveur gérera automatiquement l'envoi massif en cas de succès
 * @param {string} serverUrl - URL du serveur Cloud Run
 * @param {string} numero - Numéro de la parution
 */
function triggerExtraction(serverUrl, numero) {
  try {
    const url = `${serverUrl}/extract`;

    const payload = {
      numero: numero,
      forceExtract: false
    };

    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };

    // Appel fire-and-forget (on ne attend pas la réponse)
    // Le serveur gérera l'extraction puis l'envoi massif automatiquement
    UrlFetchApp.fetch(url, options);

    Logger.log("✅ Extraction déclenchée (fire-and-forget)");
    Logger.log("ℹ️ Le serveur gérera automatiquement:");
    Logger.log("   1. Extraction des annonces depuis le PDF");
    Logger.log("   2. Génération des embeddings");
    Logger.log("   3. Envoi massif du PDF aux abonnés (si extraction réussie)");
    Logger.log("   4. Notifications admin (succès ou échec)");

  } catch (error) {
    Logger.log('❌ Erreur lors du déclenchement de l\'extraction: ' + error.toString());
    // On ne throw pas l'erreur car c'est fire-and-forget
  }
}

