import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { performance } from 'perf_hooks'; // Pour mesurer le temps avec précision

// --- CONFIGURATION ---
const INPUT_PDF = 'page5.pdf';
const OUTPUT_JSON = 'annonces.json';
const MODEL_NAME = 'gemini-2.5-flash';

// --- TARIFICATION (USD par 1 million de tokens) ---
// À mettre à jour si la tarification de Google change
const PRICE_PER_MILLION_INPUT_TOKENS = 0.35;
const PRICE_PER_MILLION_OUTPUT_TOKENS = 1.05;

// Vérification de la clé API
if (!process.env.GEMINI_API_KEY) {
  console.error("ERREUR: La variable d'environnement GEMINI_API_KEY est manquante.");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// --- PROMPT SYSTÈME (inchangé) ---
const SYSTEM_PROMPT = `
Tu es un assistant expert spécialisé dans l'extraction de données structurées depuis des documents PDF.
Ta tâche est d'analyser la page du magazine fournie et d'extraire méticuleusement toutes les petites annonces textuelles.

IGNORE les grands encarts publicitaires graphiques. Concentre-toi uniquement sur les annonces textuelles dans les cadres.

Le résultat doit être un tableau JSON valide. Chaque objet du tableau doit représenter une seule petite annonce et suivre la structure suivante :
{
  "category": "La catégorie principale de la section (ex: 'HORECA SPECTACLE').",
  "subcategory": "La sous-catégorie si elle existe (ex: 'SCOLAIRE'), sinon null.",
  "title": "Le titre de l'annonce en majuscules (ex: 'OFFRE D'EMPLOI').",
  "description": "Le corps du texte de l'annonce.",
  "contact": "Les informations de contact.",
  "reference": "Le code de référence de l'annonce (ex: 'GA001 251009 E0008'), s'il est présent. Sinon, null.",
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

async function main() {
  const startTime = performance.now(); // Démarrage du chronomètre
  console.log(`Début du traitement de ${INPUT_PDF}...`);

  if (!fs.existsSync(INPUT_PDF)) {
    console.error(`Erreur: Le fichier ${INPUT_PDF} est introuvable.`);
    return;
  }

  try {
    const pdfBase64 = fs.readFileSync(INPUT_PDF).toString('base64');

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
            { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
          ],
        },
      ],
    });

    console.log('Réponse reçue de Gemini. Traitement...');
    // console.log(JSON.stringify(response, null, 2));
    const candidate = response.candidates?.[0];

    if (!candidate || !candidate.content || !candidate.content.parts?.[0]) {
      const blockReason = response.promptFeedback?.blockReason;
      throw new Error(
        blockReason
          ? `La requête a été bloquée. Raison : ${blockReason}`
          : "La réponse de l'API est invalide ou vide."
      );

    // --- Extraction des données ---
    const rawJson = candidate.content.parts[0].text;
    const adsData = JSON.parse(rawJson);
    console.log(`Succès ! ${adsData.length} annonces extraites.`);

    // --- Sauvegarde du fichier ---
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(adsData, null, 2), 'utf-8');
    console.log(`Résultats sauvegardés dans ${OUTPUT_JSON}`);

    // --- Calcul et affichage des statistiques ---
    const endTime = performance.now(); // Arrêt du chronomètre
    const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);

    // Extraction des métadonnées sur l'utilisation des tokens
    const usage = response.usageMetadata;
    const inputTokens = usage?.promptTokenCount || 0;
    const outputTokens = usage?.candidatesTokenCount || 0;

    // Calcul du coût
    const inputCost = (inputTokens / 1_000_000) * PRICE_PER_MILLION_INPUT_TOKENS;
    const outputCost = (outputTokens / 1_000_000) * PRICE_PER_MILLION_OUTPUT_TOKENS;
    const totalCost = inputCost + outputCost;

    console.log("\n--- STATISTIQUES D'EXTRACTION ---");
    console.log(`Durée du traitement : ${durationInSeconds} secondes`);
    console.log(`Tokens envoyés (input) : ${inputTokens}`);
    console.log(`Tokens reçus (output) : ${outputTokens}`);
    console.log(`-----------------------------------`);
    console.log(`Coût estimé du traitement : $${totalCost.toFixed(6)} USD`);
    console.log('-----------------------------------');

  } catch (error) {
    console.error("Une erreur est survenue pendant l'extraction :", error);
  }
}

main();
