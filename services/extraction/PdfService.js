import { PDFDocument } from 'pdf-lib';
import fetch from 'node-fetch';
import { logger } from '../../shared/logger.js';
import { PDF_CONFIG } from '../../shared/config/constants.js';

/**
 * Service pour gérer le téléchargement et le découpage de fichiers PDF
 */
export class PdfService {
  /**
   * Télécharge un PDF depuis une URL
   * @param {string} url - URL du PDF
   * @returns {Promise<ArrayBuffer>} Buffer du PDF
   */
  async downloadPdf(url) {
    try {
      logger.info({ url }, 'Téléchargement du PDF');

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const sizeMB = (arrayBuffer.byteLength / 1024 / 1024).toFixed(2);

      logger.info({ url, sizeMB }, 'PDF téléchargé');
      return arrayBuffer;
    } catch (error) {
      logger.error({ err: error, url }, 'Erreur lors du téléchargement du PDF');
      throw error;
    }
  }

  /**
   * Découpe un PDF en pages individuelles
   * @param {ArrayBuffer} pdfBuffer - Buffer du PDF complet
   * @param {Array<number>} pageNumbers - Numéros des pages à extraire (1-indexed)
   * @returns {Promise<Array<{pageNumber: number, pdfBuffer: Buffer}>>} Array de buffers PDF
   */
  async splitPdf(pdfBuffer, pageNumbers = PDF_CONFIG.PAGES_TO_EXTRACT) {
    try {
      logger.info({ pageNumbers }, 'Découpage du PDF en pages individuelles');

      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const totalPages = pdfDoc.getPageCount();

      logger.debug({ totalPages }, 'Nombre total de pages');

      // Vérifier que les pages demandées existent
      const validPageNumbers = pageNumbers.filter(
        num => num >= 1 && num <= totalPages
      );

      if (validPageNumbers.length !== pageNumbers.length) {
        const invalidPages = pageNumbers.filter(
          num => num < 1 || num > totalPages
        );
        logger.warn({ invalidPages }, 'Pages invalides ignorées');
      }

      // Extraire chaque page dans un PDF séparé
      const extractedPages = [];

      for (const pageNumber of validPageNumbers) {
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

        const sizeKB = (buffer.length / 1024).toFixed(2);
        logger.debug({ pageNumber, sizeKB }, 'Page extraite');
      }

      logger.info(
        { extractedCount: extractedPages.length },
        'Pages extraites avec succès'
      );
      return extractedPages;

    } catch (error) {
      logger.error({ err: error }, 'Erreur lors du découpage du PDF');
      throw error;
    }
  }

  /**
   * Pipeline complet: télécharge et découpe un PDF
   * @param {string} pdfUrl - URL du PDF
   * @param {Array<number>} pageNumbers - Numéros des pages à extraire
   * @returns {Promise<Array<{pageNumber: number, pdfBuffer: Buffer}>>} Array de pages extraites
   */
  async downloadAndSplit(pdfUrl, pageNumbers = PDF_CONFIG.PAGES_TO_EXTRACT) {
    try {
      logger.info({ pdfUrl, pageNumbers }, 'Début du traitement du PDF');

      // 1. Télécharger le PDF
      const pdfBuffer = await this.downloadPdf(pdfUrl);

      // 2. Découper en pages
      const pages = await this.splitPdf(pdfBuffer, pageNumbers);

      logger.info(
        { pdfUrl, pagesCount: pages.length },
        'Traitement du PDF terminé'
      );
      return pages;
    } catch (error) {
      logger.error({ err: error, pdfUrl }, 'Erreur lors du traitement du PDF');
      throw error;
    }
  }
}
