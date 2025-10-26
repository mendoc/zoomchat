import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fetch from 'node-fetch';

/**
 * Télécharge un PDF depuis une URL
 * @param {string} url - URL du PDF
 * @returns {Promise<ArrayBuffer>} Buffer du PDF
 */
export async function downloadPDF(url) {
  try {
    console.log(`📥 Téléchargement du PDF depuis: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ PDF téléchargé: ${arrayBuffer.byteLength} bytes`);
    return arrayBuffer;
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement du PDF:', error);
    throw error;
  }
}

/**
 * Extrait le texte brut d'un PDF
 * @param {ArrayBuffer} pdfBuffer - Buffer du PDF
 * @returns {Promise<string>} Texte extrait
 */
export async function extractText(pdfBuffer) {
  try {
    console.log('📄 Extraction du texte du PDF...');

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    console.log(`📄 Nombre de pages: ${numPages}`);

    let fullText = '';

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';

      if (pageNum % 5 === 0) {
        console.log(`📄 Pages traitées: ${pageNum}/${numPages}`);
      }
    }

    console.log(`✅ Extraction terminée: ${fullText.length} caractères`);
    return fullText;
  } catch (error) {
    console.error('❌ Erreur lors de l\'extraction du texte:', error);
    throw error;
  }
}

/**
 * Parse le texte extrait pour identifier les annonces
 * @param {string} text - Texte extrait du PDF
 * @returns {Array} Liste d'annonces structurées
 */
export function parseAnnonces(text) {
  console.log('🔍 Parsing des annonces...');

  const annonces = [];

  // Regex pour détecter les références d'annonces (ex: GA001 251016 L0005)
  const referencePattern = /\(GA\d{3}\s+\d{6}\s+[A-Z]\d{4}\)/g;

  // Découper le texte par références
  const parts = text.split(referencePattern);
  const references = text.match(referencePattern) || [];

  // Regex pour extraire téléphone et prix
  const telPattern = /(?:Tél\.?\s*[:.]?\s*)?(\d{3}\s*\d{2}\s*\d{2}\s*\d{2})/g;
  const prixPattern = /(\d+\s*(?:000)?\s*FCFA)/g;

  // Catégories possibles
  const categories = ['Emploi', 'Véhicule', 'Immobilier', 'Objet', 'People'];

  for (let i = 0; i < references.length; i++) {
    const texteAnnonce = parts[i + 1] || '';

    if (texteAnnonce.trim().length < 20) continue; // Ignorer les annonces trop courtes

    // Extraire le téléphone
    const telMatch = texteAnnonce.match(telPattern);
    const telephone = telMatch ? telMatch[0].replace(/[^\d\s]/g, '').trim() : null;

    // Extraire le prix
    const prixMatch = texteAnnonce.match(prixPattern);
    const prix = prixMatch ? prixMatch[0].trim() : null;

    // Deviner la catégorie
    let categorie = 'Autre';
    for (const cat of categories) {
      if (text.indexOf(cat) !== -1 && text.indexOf(cat) < text.indexOf(references[i])) {
        categorie = cat;
      }
    }

    annonces.push({
      texteComplet: texteAnnonce.trim(),
      telephone,
      prix,
      categorie
    });
  }

  console.log(`✅ ${annonces.length} annonces détectées`);
  return annonces;
}

/**
 * Pipeline complet: télécharge, extrait et parse un PDF
 * @param {string} pdfUrl - URL du PDF
 * @returns {Promise<Array>} Liste d'annonces
 */
export async function processPDF(pdfUrl) {
  try {
    const pdfBuffer = await downloadPDF(pdfUrl);
    const text = await extractText(pdfBuffer);
    const annonces = parseAnnonces(text);
    return annonces;
  } catch (error) {
    console.error('❌ Erreur lors du traitement du PDF:', error);
    throw error;
  }
}
