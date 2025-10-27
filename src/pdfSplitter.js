import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';

/**
 * Pages à extraire du PDF Zoom Hebdo (contiennent les annonces)
 */
const PAGES_TO_EXTRACT = [1, 3, 5, 6, 7];

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
    console.log(`✅ PDF téléchargé: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);
    return arrayBuffer;
  } catch (error) {
    console.error('❌ Erreur lors du téléchargement du PDF:', error);
    throw error;
  }
}

/**
 * Découpe un PDF en pages individuelles
 * @param {ArrayBuffer} pdfBuffer - Buffer du PDF complet
 * @param {Array<number>} pageNumbers - Numéros des pages à extraire (1-indexed)
 * @returns {Promise<Array<{pageNumber: number, pdfBuffer: Buffer}>>} Array de buffers PDF
 */
export async function splitPDF(pdfBuffer, pageNumbers = PAGES_TO_EXTRACT) {
  try {
    console.log(`📄 Découpage du PDF en pages individuelles: ${pageNumbers.join(', ')}`);

    // Charger le PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const totalPages = pdfDoc.getPageCount();

    console.log(`📊 Nombre total de pages: ${totalPages}`);

    // Vérifier que les pages demandées existent
    const validPageNumbers = pageNumbers.filter(num => num >= 1 && num <= totalPages);

    if (validPageNumbers.length !== pageNumbers.length) {
      const invalidPages = pageNumbers.filter(num => num < 1 || num > totalPages);
      console.warn(`⚠️ Pages invalides ignorées: ${invalidPages.join(', ')}`);
    }

    // Extraire chaque page dans un PDF séparé
    const extractedPages = [];

    for (const pageNumber of validPageNumbers) {
      // Créer un nouveau document PDF
      const newPdfDoc = await PDFDocument.create();

      // Copier la page (index 0-based)
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageNumber - 1]);
      newPdfDoc.addPage(copiedPage);

      // Convertir en buffer
      const pdfBytes = await newPdfDoc.save();
      const buffer = Buffer.from(pdfBytes);

      extractedPages.push({
        pageNumber,
        pdfBuffer: buffer
      });

      console.log(`✅ Page ${pageNumber} extraite (${(buffer.length / 1024).toFixed(2)} KB)`);
    }

    console.log(`✅ ${extractedPages.length} pages extraites avec succès`);
    return extractedPages;

  } catch (error) {
    console.error('❌ Erreur lors du découpage du PDF:', error);
    throw error;
  }
}

/**
 * Pipeline complet: télécharge et découpe un PDF
 * @param {string} pdfUrl - URL du PDF
 * @param {Array<number>} pageNumbers - Numéros des pages à extraire (défaut: PAGES_TO_EXTRACT)
 * @returns {Promise<Array<{pageNumber: number, pdfBuffer: Buffer}>>} Array de pages extraites
 */
export async function downloadAndSplitPDF(pdfUrl, pageNumbers = PAGES_TO_EXTRACT) {
  try {
    // 1. Télécharger le PDF
    const pdfBuffer = await downloadPDF(pdfUrl);

    // 2. Découper en pages
    const pages = await splitPDF(pdfBuffer, pageNumbers);

    return pages;
  } catch (error) {
    console.error('❌ Erreur lors du traitement du PDF:', error);
    throw error;
  }
}
