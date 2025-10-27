import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

// Vérification de la clé API
if (!process.env.GEMINI_API_KEY) {
  console.error("ERREUR: La variable d'environnement GEMINI_API_KEY est manquante.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Prompt système pour l'extraction des annonces
 * Inspiré de extractor.js
 */
const SYSTEM_PROMPT = `
Tu es un assistant expert spécialisé dans l'extraction de données structurées depuis des documents PDF.
Ta tâche est d'analyser la page du magazine fournie et d'extraire méticuleusement toutes les petites annonces textuelles.

IGNORE les grands encarts publicitaires graphiques. Concentre-toi uniquement sur les annonces textuelles dans les cadres.

Le résultat doit être un tableau JSON valide. Chaque objet du tableau doit représenter une seule petite annonce et suivre la structure suivante :
{
  "reference": "Le code de référence de l'annonce (ex: 'GA001 251009 E0008'), s'il est présent. Sinon, null.",
  "category": "La catégorie principale de la section (ex: 'HORECA SPECTACLE').",
  "subcategory": "La sous-catégorie si elle existe (ex: 'SCOLAIRE'), sinon null.",
  "title": "Le titre de l'annonce en majuscules (ex: 'OFFRE D'EMPLOI').",
  "description": "Le corps du texte de l'annonce.",
  "contact": "Les informations de contact.",
  "price": "Le prix ou salaire mentionné dans l'annonce (ex: '100 000 FCFA/mois', '3000 000 FCFA'), s'il est présent. Sinon, null.",
  "location": "Le lieu mentionné dans l'annonce (quartier, ville, etc., ex: 'Angondjé aux Tsanguettes', 'Nzeng-Ayong'), s'il est présent. Sinon, null."
}

Règles importantes :
1. La catégorie est le grand titre de section.
2. La sous-catégorie est le titre intermédiaire. Si absente, la valeur doit être null.
3. Extrais le code de référence unique, généralement en bas de l'annonce. Si absent, la valeur doit être null. La clé JSON doit être "reference".
4. Extrais tout montant financier (prix, salaire) et place-le dans le champ "price". Si aucun montant n'est trouvé, la valeur doit être null.
5. Identifie et extrais tout nom de lieu (ville, quartier) et place-le dans le champ "location". Si aucun lieu n'est trouvé, la valeur doit être null.
6. NE GÉNÈRE AUCUN TEXTE AVANT OU APRÈS LE JSON. Uniquement le tableau brut.
`;

/**
 * Extrait les annonces d'une page PDF avec gestion des erreurs de surcharge
 * @param {Buffer} pdfBuffer - Buffer de la page PDF
 * @param {number} pageNumber - Numéro de la page (pour logging)
 * @param {number} maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @returns {Promise<Array>} Liste des annonces extraites
 */
export async function extractAnnoncesFromPage(pdfBuffer, pageNumber, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;

    try {
      console.log(`🤖 Tentative ${attempt}/${maxRetries} - Analyse LLM de la page ${pageNumber}...`);

      const pdfBase64 = pdfBuffer.toString('base64');

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        config: {
          responseMimeType: 'application/json',
        },
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
            ],
          },
        ],
      });

      // Vérifier la réponse
      const candidate = response.candidates?.[0];

      if (!candidate || !candidate.content || !candidate.content.parts?.[0]) {
        const blockReason = response.promptFeedback?.blockReason;
        throw new Error(blockReason ? `La requête a été bloquée. Raison : ${blockReason}` : "La réponse de l'API est invalide ou vide.");
      }

      // Extraction et parsing
      const rawJson = candidate.content.parts[0].text;
      const annonces = JSON.parse(rawJson);

      console.log(`✅ Page ${pageNumber}: ${annonces.length} annonces extraites`);

      // Afficher les métadonnées d'utilisation
      const usage = response.usageMetadata;
      if (usage) {
        console.log(`   📊 Tokens: ${usage.promptTokenCount} input, ${usage.candidatesTokenCount} output`);
      }

      return annonces;

    } catch (error) {
      lastError = error;

      // Vérifier si c'est une erreur de surcharge
      const isOverloaded = error.message && error.message.toLowerCase().includes("overloaded");

      if (isOverloaded) {
        // Backoff exponentiel: 1s, 3s, 10s
        const waitTimes = [1000, 3000, 10000];
        const waitTime = waitTimes[attempt - 1] || 10000;

        console.warn(`⚠️ Modèle surchargé (page ${pageNumber}). Attente de ${waitTime / 1000}s avant nouvelle tentative...`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Réessayer
        }
      }

      // Si ce n'est pas une surcharge ou si on a épuisé les tentatives
      if (attempt >= maxRetries) {
        console.error(`❌ Échec de l'extraction de la page ${pageNumber} après ${maxRetries} tentatives:`, error.message);
        throw error;
      }

      // Pour les autres erreurs, attendre quand même un peu avant de réessayer
      console.warn(`⚠️ Erreur sur la page ${pageNumber}. Nouvelle tentative dans 2s...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Si on arrive ici, on a épuisé toutes les tentatives
  throw lastError || new Error(`Échec de l'extraction après ${maxRetries} tentatives`);
}

/**
 * Extrait les annonces de toutes les pages avec un pool de workers continu
 * Dès qu'un worker termine, il prend la page suivante dans la queue
 * @param {Array<{pageNumber: number, pdfBuffer: Buffer}>} pages - Array de pages PDF
 * @param {number} maxConcurrent - Nombre max de workers en parallèle (défaut: 3)
 * @returns {Promise<{annonces: Array, stats: object}>} Annonces extraites avec statistiques détaillées
 */
export async function extractAllAnnonces(pages, maxConcurrent = 3) {
  console.log(`\n🚀 Démarrage de l'extraction Gemini pour ${pages.length} pages (pool de ${maxConcurrent} workers)...\n`);

  const allAnnonces = [];
  const errors = [];
  const pageDetails = [];
  let pageIndex = 0;
  let activeWorkers = 0;
  let completedPages = 0;

  // Fonction worker qui traite les pages de manière continue
  async function worker() {
    while (pageIndex < pages.length) {
      // Prendre la prochaine page dans la queue
      const currentIndex = pageIndex++;
      const { pageNumber, pdfBuffer } = pages[currentIndex];

      activeWorkers++;
      const startTime = Date.now();
      console.log(`🔄 Worker démarre page ${pageNumber} (${activeWorkers} actifs, ${completedPages}/${pages.length} terminées)`);

      try {
        const annonces = await extractAnnoncesFromPage(pdfBuffer, pageNumber);
        const duration = Date.now() - startTime;

        if (annonces && annonces.length > 0) {
          allAnnonces.push(...annonces);
          console.log(`✅ Page ${pageNumber}: ${annonces.length} annonces collectées`);

          pageDetails.push({
            pageNumber,
            annoncesCount: annonces.length,
            duration: Math.round(duration / 1000), // en secondes
            status: 'success'
          });
        } else {
          console.log(`⏭️ Page ${pageNumber}: Aucune annonce`);

          pageDetails.push({
            pageNumber,
            annoncesCount: 0,
            duration: Math.round(duration / 1000),
            status: 'success'
          });
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ Erreur irrémédiable sur la page ${pageNumber}:`, error.message);

        errors.push({ pageNumber, error: error.message });
        pageDetails.push({
          pageNumber,
          annoncesCount: 0,
          duration: Math.round(duration / 1000),
          status: 'error',
          error: error.message
        });
      } finally {
        activeWorkers--;
        completedPages++;
      }
    }
  }

  // Démarrer le pool de workers
  const workerPromises = [];
  for (let i = 0; i < Math.min(maxConcurrent, pages.length); i++) {
    workerPromises.push(worker());
  }

  // Attendre que tous les workers aient terminé
  await Promise.all(workerPromises);

  const totalAnnonces = allAnnonces.length;

  console.log(`\n📊 Extraction terminée:`);
  console.log(`   - ${pages.length - errors.length}/${pages.length} pages traitées avec succès`);
  console.log(`   - ${totalAnnonces} annonces extraites au total`);

  if (errors.length > 0) {
    console.log(`   - ${errors.length} pages en erreur: ${errors.map(e => e.pageNumber).join(', ')}`);
  }

  console.log('');

  // Retourner à la fois les annonces et les statistiques détaillées
  return {
    annonces: allAnnonces,
    stats: {
      totalPages: pages.length,
      pagesSuccess: pages.length - errors.length,
      pagesErrors: errors.length,
      totalAnnonces,
      errors,
      pageDetails: pageDetails.sort((a, b) => a.pageNumber - b.pageNumber)
    }
  };
}

/**
 * Valide et nettoie les données d'une annonce
 * @param {object} annonce - Annonce brute extraite par Gemini
 * @returns {object} Annonce nettoyée
 */
export function cleanAnnonce(annonce) {
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
