import { GoogleGenAI } from '@google/genai';

// Initialiser l'API Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Génère un embedding vectoriel à partir d'un texte
 * Utilise le modèle gemini-embedding-001 de Google
 *
 * @param {string} text - Texte à convertir en embedding
 * @returns {Promise<number[]>} Vecteur d'embedding (1536 dimensions - tronqué depuis 3072)
 */
export async function generateEmbedding(text) {
  try {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Le texte doit être une chaîne non vide');
    }

    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      taskType: 'RETRIEVAL_DOCUMENT'
      // Note: outputDimensionality ne fonctionne pas, retourne 3072 dimensions
    });

    let embedding = response.embeddings && response.embeddings.length > 0
      ? response.embeddings[0].values
      : null;

    if (!embedding || embedding.length !== 3072) {
      throw new Error(`Embedding invalide: dimension ${embedding?.length || 0}, attendu 3072`);
    }

    // Tronquer à 1536 dimensions (pgvector limité à 2000, on prend une valeur standard)
    // Les premières dimensions contiennent l'information la plus importante (MRL)
    embedding = embedding.slice(0, 1536);

    return embedding;
  } catch (error) {
    console.error('❌ Erreur lors de la génération d\'embedding:', error.message);
    throw error;
  }
}

/**
 * Crée un texte composite optimisé pour l'embedding d'une annonce
 * Combine les champs pertinents avec pondération implicite (ordre)
 *
 * @param {object} annonce - Objet annonce
 * @returns {string} Texte composite pour embedding
 */
export function createCompositeText(annonce) {
  const parts = [];

  // Ordre d'importance : catégorie, titre, localisation, description
  if (annonce.category) parts.push(annonce.category);
  if (annonce.subcategory) parts.push(annonce.subcategory);
  if (annonce.title) parts.push(annonce.title);
  if (annonce.location) parts.push(`à ${annonce.location}`);
  if (annonce.price) parts.push(`prix ${annonce.price}`);
  if (annonce.description) {
    // Limiter la description à 500 caractères pour éviter la dilution
    const desc = annonce.description.length > 500
      ? annonce.description.substring(0, 500) + '...'
      : annonce.description;
    parts.push(desc);
  }

  return parts.filter(Boolean).join(' ');
}

/**
 * Génère des embeddings pour un batch d'annonces
 * Avec gestion du rate limiting (1500 req/min max)
 *
 * @param {Array} annonces - Liste d'annonces
 * @param {Function} onProgress - Callback de progression (current, total)
 * @returns {Promise<Array>} Liste d'embeddings correspondants
 */
export async function generateBatchEmbeddings(annonces, onProgress = null) {
  const embeddings = [];
  const delayMs = 50; // ~1200 req/min, bien sous la limite de 1500

  for (let i = 0; i < annonces.length; i++) {
    const annonce = annonces[i];

    try {
      const text = createCompositeText(annonce);
      const embedding = await generateEmbedding(text);
      embeddings.push({ id: annonce.id, embedding });

      if (onProgress) {
        onProgress(i + 1, annonces.length);
      }

      // Pause pour respecter le rate limit
      if (i < annonces.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`❌ Erreur embedding pour annonce ${annonce.id}:`, error.message);
      embeddings.push({ id: annonce.id, embedding: null, error: error.message });
    }
  }

  return embeddings;
}

/**
 * Convertit un array JavaScript en format PostgreSQL vector
 * @param {number[]} embedding - Vecteur d'embedding
 * @returns {string} Représentation textuelle pour PostgreSQL (ex: '[0.1,0.2,0.3]')
 */
export function embeddingToPostgres(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error('L\'embedding doit être un array');
  }
  return `[${embedding.join(',').replace(/ /g, '')}]`;
}
