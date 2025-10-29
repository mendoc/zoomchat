import { GoogleGenAI } from '@google/genai';
import { logger } from '../../shared/logger.js';
import { GEMINI_CONFIG, PDF_CONFIG } from '../../shared/config/constants.js';
import { EXTRACTION_SYSTEM_PROMPT } from '../../locales/prompts/extraction-prompt.js';
import { ValidationError } from '../../shared/errors.js';

/**
 * Service pour extraire des annonces depuis des PDFs avec Google Gemini
 */
export class GeminiService {
  /**
   * @param {string} apiKey - Clé API Google Gemini
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new ValidationError('API key Gemini requise');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Extrait les annonces d'une page PDF avec retry logic
   * @param {Buffer} pdfBuffer - Buffer du PDF d'une page
   * @param {number} pageNumber - Numéro de la page
   * @param {number} maxRetries - Nombre maximum de tentatives
   * @returns {Promise<Array>} Liste d'annonces extraites
   */
  async extractFromPage(pdfBuffer, pageNumber, maxRetries = GEMINI_CONFIG.MAX_RETRIES) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;

      try {
        logger.info(
          { attempt, maxRetries, pageNumber },
          'Tentative d\'analyse LLM'
        );

        const pdfBase64 = pdfBuffer.toString('base64');

        const result = await this.ai.models.generateContent({
          model: GEMINI_CONFIG.MODEL_NAME,
          contents: [
            { text: EXTRACTION_SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: PDF_CONFIG.MIME_TYPE,
                data: pdfBase64
              }
            }
          ]
        });

        const text = result.text;

        // Parser le JSON retourné
        const annonces = JSON.parse(text);

        logger.info(
          {
            pageNumber,
            count: annonces.length,
            attempt
          },
          'Annonces extraites de la page'
        );

        return annonces;

      } catch (error) {
        lastError = error;

        // Vérifier si c'est une erreur de surcharge
        const isOverloaded = error.message &&
          error.message.toLowerCase().includes('overloaded');

        if (isOverloaded) {
          const waitTime = GEMINI_CONFIG.RETRY_DELAYS[attempt - 1] || 10000;

          logger.warn(
            { pageNumber, waitTime, attempt, maxRetries },
            'Modèle surchargé, attente avant retry'
          );

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
        }

        // Si ce n'est pas une surcharge ou si on a épuisé les tentatives
        if (attempt >= maxRetries) {
          logger.error(
            { err: error, pageNumber, maxRetries },
            'Échec de l\'extraction après toutes les tentatives'
          );
          throw error;
        }

        // Pour les autres erreurs, attendre quand même un peu
        logger.warn(
          { pageNumber, attempt },
          'Erreur, nouvelle tentative dans 2s'
        );
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Si on arrive ici, on a épuisé toutes les tentatives
    throw lastError || new Error(
      `Échec de l\'extraction après ${maxRetries} tentatives`
    );
  }

  /**
   * Extrait les annonces de toutes les pages avec traitement parallèle
   * @param {Array<{pageNumber: number, pdfBuffer: Buffer}>} pages - Pages PDF
   * @param {number} maxConcurrent - Nombre max de workers en parallèle
   * @returns {Promise<{annonces: Array, stats: object}>} Résultats avec stats
   */
  async extractAll(pages, maxConcurrent = 3) {
    logger.info(
      { pagesCount: pages.length, maxConcurrent },
      'Début de l\'extraction Gemini'
    );

    const allAnnonces = [];
    const errors = [];
    const pageDetails = [];
    let pageIndex = 0;

    // Worker function
    const worker = async (workerId) => {
      while (pageIndex < pages.length) {
        const currentIndex = pageIndex++;
        const page = pages[currentIndex];

        try {
          const startTime = Date.now();
          const annonces = await this.extractFromPage(
            page.pdfBuffer,
            page.pageNumber
          );

          const cleanedAnnonces = annonces.map(a => this.cleanAnnonce(a));
          allAnnonces.push(...cleanedAnnonces);

          const duration = Date.now() - startTime;
          pageDetails.push({
            pageNumber: page.pageNumber,
            annoncesCount: cleanedAnnonces.length,
            duration,
            workerId
          });

          logger.info(
            { pageNumber: page.pageNumber, count: cleanedAnnonces.length, duration },
            'Page traitée avec succès'
          );

        } catch (error) {
          logger.error(
            { err: error, pageNumber: page.pageNumber },
            'Erreur lors du traitement de la page'
          );

          errors.push({
            pageNumber: page.pageNumber,
            error: error.message
          });
        }

        // Pause entre les pages pour respecter le rate limit
        if (pageIndex < pages.length) {
          await new Promise(resolve =>
            setTimeout(resolve, GEMINI_CONFIG.RATE_LIMIT_DELAY)
          );
        }
      }
    };

    // Lancer les workers
    const workers = Array.from({ length: maxConcurrent }, (_, i) => worker(i));
    await Promise.all(workers);

    const stats = {
      totalPages: pages.length,
      pagesSuccess: pages.length - errors.length,
      pagesErrors: errors.length,
      totalAnnonces: allAnnonces.length,
      errors,
      pageDetails: pageDetails.sort((a, b) => a.pageNumber - b.pageNumber)
    };

    logger.info(
      {
        totalPages: stats.totalPages,
        pagesSuccess: stats.pagesSuccess,
        totalAnnonces: stats.totalAnnonces
      },
      'Extraction terminée'
    );

    return { annonces: allAnnonces, stats };
  }

  /**
   * Valide et nettoie les données d'une annonce
   * @param {object} annonce - Annonce brute extraite par Gemini
   * @returns {object} Annonce nettoyée
   */
  cleanAnnonce(annonce) {
    return {
      category: annonce.category?.trim() || null,
      subcategory: annonce.subcategory?.trim() || null,
      title: annonce.title?.trim() || null,
      reference: annonce.reference?.trim() || null,
      description: annonce.description?.trim() || '',
      contact: annonce.contact?.trim() || null,
      price: annonce.price?.trim() || null,
      location: annonce.location?.trim() || null,
    };
  }
}
