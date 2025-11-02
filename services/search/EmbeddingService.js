import { GoogleGenAI } from '@google/genai';
import { logger } from '../../shared/logger.js';
import { EMBEDDING_CONFIG } from '../../shared/config/constants.js';
import { ValidationError } from '../../shared/errors.js';

/**
 * Service pour générer des embeddings vectoriels avec Google Gemini
 */
export class EmbeddingService {
  /**
   * @param {string} apiKey - Clé API Google Gemini
   */
  constructor(apiKey) {
    if (!apiKey) {
      throw new ValidationError('API key Gemini requise');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.dimensions = EMBEDDING_CONFIG.DIMENSIONS;
  }

  /**
   * Génère un embedding vectoriel à partir d'un texte
   * @param {string} text - Texte à convertir en embedding
   * @returns {Promise<number[]>} Vecteur d'embedding
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new ValidationError('Le texte doit être une chaîne non vide');
    }

    try {
      const response = await this.ai.models.embedContent({
        model: EMBEDDING_CONFIG.MODEL_NAME,
        contents: text,
        taskType: EMBEDDING_CONFIG.TASK_TYPE,
      });

      let embedding = response.embeddings[0].values;

      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("Embedding invalide retourné par l'API");
      }

      // Le modèle gemini-embedding-001 retourne 3072 dimensions
      // On ne garde que les 1536 premières dimensions (Matryoshka Representation Learning)
      // Les premières dimensions contiennent l'information la plus importante
      embedding = embedding.slice(0, this.dimensions);

      logger.debug(
        {
          textLength: text.length,
          embeddingDim: embedding.length,
        },
        'Embedding généré'
      );

      return embedding;
    } catch (error) {
      logger.error(
        { err: error, textLength: text.length },
        "Erreur lors de la génération d'embedding"
      );
      throw error;
    }
  }

  /**
   * Crée un texte composite optimisé pour l'embedding d'une annonce
   * @param {object} annonce - Objet annonce
   * @returns {string} Texte composite pour embedding
   */
  createCompositeText(annonce) {
    const parts = [];

    // Ordre d'importance : catégorie, titre, localisation, description
    if (annonce.category) parts.push(annonce.category);
    if (annonce.subcategory) parts.push(annonce.subcategory);
    if (annonce.title) parts.push(annonce.title);
    if (annonce.location) parts.push(`à ${annonce.location}`);
    if (annonce.price) parts.push(`prix ${annonce.price}`);
    if (annonce.description) {
      // Limiter la description à 500 caractères pour éviter la dilution
      const desc =
        annonce.description.length > 500
          ? `${annonce.description.substring(0, 500)}...`
          : annonce.description;
      parts.push(desc);
    }

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Génère des embeddings pour un batch d'annonces avec rate limiting
   * @param {Array} annonces - Liste d'annonces
   * @param {Function} onProgress - Callback de progression (current, total)
   * @returns {Promise<Array>} Liste d'embeddings correspondants
   */
  async generateBatch(annonces, onProgress = null) {
    const embeddings = [];
    const delayMs = EMBEDDING_CONFIG.RATE_LIMIT_DELAY;

    logger.info({ count: annonces.length, delayMs }, "Début de génération batch d'embeddings");

    for (let i = 0; i < annonces.length; i++) {
      const annonce = annonces[i];

      try {
        const text = this.createCompositeText(annonce);
        const embedding = await this.generateEmbedding(text);
        embeddings.push({ id: annonce.id, embedding });

        if (onProgress) {
          onProgress(i + 1, annonces.length);
        }

        // Pause pour respecter le rate limit
        if (i < annonces.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        logger.error({ err: error, annonceId: annonce.id }, 'Erreur embedding pour annonce');
        embeddings.push({
          id: annonce.id,
          embedding: null,
          error: error.message,
        });
      }
    }

    logger.info(
      {
        total: annonces.length,
        success: embeddings.filter((e) => e.embedding !== null).length,
        failed: embeddings.filter((e) => e.embedding === null).length,
      },
      'Génération batch terminée'
    );

    return embeddings;
  }

  /**
   * Convertit un array JavaScript en format PostgreSQL vector
   * @param {number[]} embedding - Vecteur d'embedding
   * @returns {string} Représentation textuelle pour PostgreSQL (ex: '[0.1,0.2,0.3]')
   */
  embeddingToPostgres(embedding) {
    if (!Array.isArray(embedding)) {
      throw new ValidationError("L'embedding doit être un array");
    }

    return `[${embedding.join(',')}]`;
  }
}
