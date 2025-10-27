import pdf2img from 'pdf-img-convert';
import fetch from 'node-fetch';
import { extractAllAnnonces, cleanAnnonce } from './llmExtractor.js';

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
 * Convertit un PDF en array d'images base64
 * @param {ArrayBuffer} pdfBuffer - Buffer du PDF
 * @returns {Promise<Array<string>>} Array d'images base64 (une par page)
 */
export async function convertPDFToImages(pdfBuffer) {
  try {
    console.log('📸 Conversion du PDF en images...');

    // Convertir ArrayBuffer en Buffer Node.js
    const buffer = Buffer.from(pdfBuffer);

    // Convertir PDF en images PNG base64
    const images = await pdf2img.convert(buffer, {
      width: 2000,        // Largeur suffisante pour bonne qualité
      height: 2828,       // Proportion A4
      base64: true        // Format base64
    });

    console.log(`✅ ${images.length} pages converties en images`);
    return images;

  } catch (error) {
    console.error('❌ Erreur lors de la conversion du PDF:', error);
    throw error;
  }
}

/**
 * Parse les annonces via LLM (remplace l'ancien parsing regex)
 * @param {Array<string>} base64Images - Array d'images base64 du PDF
 * @returns {Promise<Array>} Liste d'annonces structurées
 */
export async function parseAnnonces(base64Images) {
  console.log('🔍 Parsing des annonces via LLM...');

  // Extraire les annonces via le LLM
  const annoncesBrutes = await extractAllAnnonces(base64Images);

  // Nettoyer et valider les données
  const annonces = annoncesBrutes.map(annonce => cleanAnnonce(annonce));

  console.log(`✅ ${annonces.length} annonces parsées et nettoyées`);
  return annonces;
}

/**
 * Pipeline complet: télécharge, convertit en images et parse un PDF via LLM
 * @param {string} pdfUrl - URL du PDF
 * @returns {Promise<Array>} Liste d'annonces
 */
export async function processPDF(pdfUrl) {
  try {
    // 1. Télécharger le PDF
    const pdfBuffer = await downloadPDF(pdfUrl);

    // 2. Convertir en images
    const images = await convertPDFToImages(pdfBuffer);

    // 3. Extraire les annonces via LLM
    const annonces = await parseAnnonces(images);

    return annonces;
  } catch (error) {
    console.error('❌ Erreur lors du traitement du PDF:', error);
    throw error;
  }
}
