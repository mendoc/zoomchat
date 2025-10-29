import { logger } from '../../shared/logger.js';
import { SEARCH_CONFIG, TELEGRAM_CONFIG } from '../../shared/config/constants.js';
import { ValidationError } from '../../shared/errors.js';

/**
 * Service de recherche hybride combinant vector similarity et full-text search
 */
export class HybridSearchService {
  /**
   * @param {AnnonceRepository} annonceRepo
   * @param {EmbeddingService} embeddingService
   */
  constructor(annonceRepo, embeddingService) {
    this.annonceRepo = annonceRepo;
    this.embeddingService = embeddingService;
  }

  /**
   * Effectue une recherche hybride
   * @param {string} query - Requête de recherche
   * @param {object} options - Options de recherche
   * @returns {Promise<Array>} Résultats de la recherche formatés
   */
  async search(query, options = {}) {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('La requête doit être une chaîne de caractères');
    }

    if (query.length > TELEGRAM_CONFIG.MAX_QUERY_LENGTH) {
      throw new ValidationError(
        `La requête ne doit pas dépasser ${TELEGRAM_CONFIG.MAX_QUERY_LENGTH} caractères`
      );
    }

    const searchOptions = {
      vectorWeight: options.vectorWeight || SEARCH_CONFIG.DEFAULT_VECTOR_WEIGHT,
      ftsWeight: options.ftsWeight || SEARCH_CONFIG.DEFAULT_FTS_WEIGHT,
      minScore: options.minScore || SEARCH_CONFIG.DEFAULT_MIN_SCORE,
      limit: options.limit || SEARCH_CONFIG.DEFAULT_LIMIT,
    };

    logger.info(
      { query, searchOptions },
      'Début de recherche hybride'
    );

    try {
      // 1. Générer l'embedding de la requête
      const queryEmbedding = await this.embeddingService.generateEmbedding(query);

      logger.debug(
        { query, embeddingDim: queryEmbedding.length },
        'Embedding de la requête généré'
      );

      // 2. Effectuer la recherche hybride
      const results = await this.annonceRepo.hybridSearch(
        queryEmbedding,
        query,
        searchOptions
      );

      logger.info(
        { query, resultsCount: results.length },
        'Recherche hybride effectuée'
      );

      // 3. Formater les résultats pour Telegram
      const formattedResults = this.formatResults(results, query);

      return formattedResults;

    } catch (error) {
      logger.error(
        { err: error, query },
        'Erreur lors de la recherche hybride'
      );
      throw error;
    }
  }

  /**
   * Formate les résultats de recherche pour l'affichage Telegram
   * @param {Array} results - Résultats bruts de la DB
   * @param {string} query - Requête originale
   * @returns {Array} Résultats formatés
   */
  formatResults(results, query) {
    if (!results || results.length === 0) {
      return [];
    }

    return results.map((result, index) => {
      const emoji = this.getCategoryEmoji(result.category);
      const score = result.combined_score || 0;

      // Construire le message
      let message = `${emoji} **${result.title || 'Sans titre'}**\n\n`;

      if (result.category) {
        message += `📁 Catégorie: ${result.category}`;
        if (result.subcategory) {
          message += ` › ${result.subcategory}`;
        }
        message += '\n';
      }

      if (result.location) {
        message += `📍 Localisation: ${result.location}\n`;
      }

      if (result.price) {
        message += `💰 Prix: ${result.price}\n`;
      }

      if (result.description) {
        const maxDescLength = 300;
        const desc = result.description.length > maxDescLength
          ? result.description.substring(0, maxDescLength) + '...'
          : result.description;
        message += `\n${desc}\n`;
      }

      if (result.contact) {
        message += `\n📞 Contact: ${result.contact.replace("Tél.", "").trim()}`;
      }

      if (result.reference) {
        // Masquer la référence pour le moment
        // message += `\n🔖 Réf: ${result.reference}`;
        message += "";
      }

      // Ajouter le score pour debug (optionnel, peut être retiré en prod)
      // message += `\n\n_Score: ${score.toFixed(3)}_`;

      return {
        index: index + 1,
        message,
        score,
        id: result.id,
        category: result.category,
        title: result.title,
      };
    });
  }

  /**
   * Retourne l'emoji approprié pour une catégorie
   * @param {string} category - Catégorie de l'annonce
   * @returns {string} Emoji correspondant
   */
  getCategoryEmoji(category) {
    if (!category) return '📄';

    const categoryLower = category.toLowerCase();

    if (categoryLower.includes('immobilier')) return '🏠';
    if (categoryLower.includes('automobile')) return '🚗';
    if (categoryLower.includes('emploi')) return '💼';
    if (categoryLower.includes('service')) return '🛠️';
    if (categoryLower.includes('vente')) return '🛒';
    if (categoryLower.includes('location')) return '🔑';
    if (categoryLower.includes('électronique')) return '📱';
    if (categoryLower.includes('meuble')) return '🪑';
    if (categoryLower.includes('formation')) return '📚';

    return '📄';
  }
}
