import { GoogleGenAI } from '@google/genai';
import { logger } from '../../shared/logger.js';
import { SEARCH_CONFIG, GEMINI_CONFIG } from '../../shared/config/constants.js';

/**
 * Service de filtrage de pertinence des résultats de recherche
 * Utilise Gemini pour valider que chaque résultat correspond bien à la requête utilisateur
 */
export class RelevanceFilterService {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for RelevanceFilterService');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Filtre les résultats non pertinents par rapport à la requête
   * @param {string} query - La requête utilisateur
   * @param {Array} results - Les résultats de la recherche vectorielle
   * @returns {Promise<Array>} - Les résultats filtrés (seulement les pertinents)
   */
  async filterIrrelevantResults(query, results) {
    // Si le filtrage est désactivé, retourner tous les résultats
    if (!SEARCH_CONFIG.RELEVANCE_FILTER_ENABLED) {
      logger.info('[RelevanceFilter] Filtrage désactivé, retour de tous les résultats');
      return results;
    }

    // Si pas assez de résultats, pas besoin de filtrer
    if (results.length < SEARCH_CONFIG.MIN_RESULTS_FOR_FILTERING) {
      logger.info(`[RelevanceFilter] Seulement ${results.length} résultats, pas de filtrage nécessaire`);
      return results;
    }

    try {
      logger.info(`[RelevanceFilter] Filtrage de ${results.length} résultats pour la requête: "${query}"`);

      // Construire le prompt avec les résultats
      const prompt = this.buildPrompt(query, results);

      // Appeler Gemini pour obtenir les validations
      const response = await this.ai.models.generateContent({
        model: GEMINI_CONFIG.MODEL_NAME,
        contents: [{ text: prompt }],
        config: {
          temperature: 0.1, // Très faible pour des réponses cohérentes
          responseMimeType: 'application/json',
        }
      });

      const responseText = response.text;

      // Log de la réponse brute pour debugging
      logger.info(`[RelevanceFilter] Réponse LLM brute: ${responseText}`);

      // Parser la réponse JSON
      const validations = JSON.parse(responseText);

      // Log des validations
      logger.info(`[RelevanceFilter] Validations: ${JSON.stringify(validations)}`);

      // Valider le format de la réponse
      if (!Array.isArray(validations) || validations.length !== results.length) {
        logger.error(`[RelevanceFilter] Format de réponse invalide du LLM. Attendu: array de ${results.length} éléments, reçu:`, validations);
        // En cas d'erreur, retourner tous les résultats (fallback sécurisé)
        return results;
      }

      // Filtrer les résultats selon les validations
      const filteredResults = results.filter((result, index) => {
        const isValidByLLM = validations[index] === true;
        const isValidByScore = result.vector_score >= 0.7;

        logger.info(`[RelevanceFilter] Annonce ${index + 1} "${result.title}": LLM=${isValidByLLM}, Score=${result.vector_score?.toFixed(3)} (≥0.7: ${isValidByScore})`);

        return isValidByLLM || isValidByScore;
      });

      const removedCount = results.length - filteredResults.length;
      logger.info(`[RelevanceFilter] ${filteredResults.length} résultats pertinents conservés, ${removedCount} éliminés`);

      return filteredResults;

    } catch (error) {
      logger.error('[RelevanceFilter] Erreur lors du filtrage:', error);
      // En cas d'erreur, retourner tous les résultats (fallback sécurisé)
      return results;
    }
  }

  /**
   * Construit le prompt pour l'analyse de pertinence
   * @param {string} query - La requête utilisateur
   * @param {Array} results - Les résultats à analyser
   * @returns {string} - Le prompt formaté
   */
  buildPrompt(query, results) {
    // Formater les annonces de manière concise pour le LLM
    const annoncesFormatted = results.map((r, index) => {
      return `${index + 1}. Titre: "${r.title || 'N/A'}"
   Catégorie: ${r.category || 'N/A'} › ${r.subcategory || 'N/A'}
   Description: ${(r.description || '').substring(0, 150)}${r.description?.length > 150 ? '...' : ''}
   Localisation: ${r.location || 'N/A'}
   Score: ${(r.vector_score || 0).toFixed(3)}`;
    }).join('\n\n');

    return `Tu es un assistant qui aide à filtrer les résultats de recherche d'annonces classées.

REQUÊTE DE L'UTILISATEUR:
"${query}"

ANNONCES TROUVÉES PAR LA RECHERCHE VECTORIELLE:
${annoncesFormatted}

TÂCHE:
Analyse chaque annonce et détermine si elle est PERTINENTE pour répondre à la requête de l'utilisateur.

CRITÈRES DE PERTINENCE:
- L'annonce doit directement répondre au besoin exprimé dans la requête
- Si l'utilisateur cherche un service/produit, l'annonce doit OFFRIR ce service/produit
- Si l'utilisateur cherche un emploi, l'annonce doit OFFRIR un emploi dans ce domaine
- Le score vectoriel indique la similarité sémantique (plus proche de 1.0 = plus pertinent)
- Privilégie les annonces avec un score > 0.5 si elles semblent correspondre au domaine recherché
- Élimine SEULEMENT les annonces qui sont clairement dans un domaine totalement différent

EXEMPLES:
- Requête "Je cherche un peintre" → Annonce "Peintre professionnel disponible" (Score: 0.85) = PERTINENT (true)
- Requête "Je cherche un peintre" → Annonce "Super peintre & maçon" (Score: 0.72) = PERTINENT (true)
- Requête "Je cherche un peintre" → Annonce "Peintre en bâtiment-décorateur" (Score: 0.68) = PERTINENT (true)
- Requête "Je cherche un peintre" → Annonce "Cherche emploi comme nounou" (Score: 0.42) = NON PERTINENT (false)
- Requête "Cherche appartement à louer" → Annonce "Villa F4 à vendre" (Score: 0.55) = NON PERTINENT (false)
- Requête "Cherche appartement à louer" → Annonce "Studio à louer" (Score: 0.88) = PERTINENT (true)

RÈGLE IMPORTANTE:
En cas de doute et si le score > 0.5, privilégie le marquage comme PERTINENT (true).
Marque comme NON PERTINENT (false) uniquement si tu es SÛR que c'est hors-sujet.

RÉPONSE ATTENDUE:
Retourne un array JSON de booléens (true = pertinent, false = non pertinent), dans l'ordre des annonces.
Format: [true, false, true, false, ...]

IMPORTANT: Le nombre de valeurs dans le array doit correspondre EXACTEMENT au nombre d'annonces (${results.length}).`;
  }
}
