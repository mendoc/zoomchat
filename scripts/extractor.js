import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { performance } from 'perf_hooks';
import pg from 'pg';

// --- CONFIGURATION POOL POSTGRESQL ---
const pool = new pg.Pool();

// --- CONFIGURATION ---
const INPUT_PDF = 'page3.pdf';
const OUTPUT_JSON = 'annonces.json';
const MODEL_NAME = 'gemini-2.5-flash';

// --- TARIFICATION pour le modèle FLASH (USD par 1 million de tokens) ---
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

// --- PROMPT SYSTÈME MIS À JOUR ---
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

async function main() {
    const startTime = performance.now();
    console.log(`Début du traitement de ${INPUT_PDF}...`);

    if (!fs.existsSync(INPUT_PDF)) {
        console.error(`Erreur: Le fichier ${INPUT_PDF} est introuvable.`);
        return;
    }

    let adsDataToInsert = [];

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
                        { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
                    ],
                },
            ],
        });

        console.log("Réponse reçue de Gemini. Traitement...");

        // Utilisation de la structure de réponse que vous avez confirmée
        const candidate = response.candidates?.[0];

        if (!candidate || !candidate.content || !candidate.content.parts?.[0]) {
            const blockReason = response.promptFeedback?.blockReason;
            throw new Error(blockReason ? `La requête a été bloquée. Raison : ${blockReason}` : "La réponse de l'API est invalide ou vide.");
        }

        // --- Extraction et Filtrage ---
        const rawJson = candidate.content.parts[0].text;
        adsDataToInsert = JSON.parse(rawJson);
        console.log(`Succès ! ${adsDataToInsert.length} annonces extraites au total.`);

        // On filtre les annonces pour ne garder que celles qui ont une référence
        const filteredAds = adsDataToInsert.filter(ad => ad.reference);
        console.log(`Filtrage terminé. ${filteredAds.length} annonces conservées (avec une référence).`);

        // --- Sauvegarde du fichier ---
        fs.writeFileSync(OUTPUT_JSON, JSON.stringify(filteredAds, null, 2), 'utf-8');
        console.log(`Résultats sauvegardés dans ${OUTPUT_JSON}`);

        // --- Calcul et affichage des statistiques ---
        const endTime = performance.now();
        const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);

        // Utilisation de la structure de réponse que vous avez confirmée
        const usage = response.usageMetadata;
        const inputTokens = usage?.promptTokenCount || 0;
        const outputTokens = usage?.candidatesTokenCount || 0;

        const inputCost = (inputTokens / 1_000_000) * PRICE_PER_MILLION_INPUT_TOKENS;
        const outputCost = (outputTokens / 1_000_000) * PRICE_PER_MILLION_OUTPUT_TOKENS;
        const totalCost = inputCost + outputCost;

        console.log("\n--- STATISTIQUES D'EXTRACTION ---");
        console.log(`Modèle utilisé : ${MODEL_NAME}`);
        console.log(`Durée du traitement : ${durationInSeconds} secondes`);
        console.log(`Tokens envoyés (input) : ${inputTokens}`);
        console.log(`Tokens reçus (output) : ${outputTokens}`);
        console.log(`-----------------------------------`);
        console.log(`Coût estimé du traitement : $${totalCost.toFixed(6)} USD`);
        console.log("-----------------------------------");

    } catch (error) {
        if (error.message.includes("overloaded")) {
            console.error("Le modèle est surchargé. Veuillez réessayer plus tard.");
        } else {
            console.error("Une erreur est survenue pendant l'extraction :", error);
        }
        return;
    }

    // --- INSERTION DANS POSTGRESQL ---
    console.log("adsDataToInsert.length", adsDataToInsert.length);
    if (adsDataToInsert.length > 0) {
        console.log("\nDébut de l'insertion en base de données...");
        let insertedCount = 0;

        const insertQuery = `
      INSERT INTO annonces (category, subcategory, title, description, contact, price, location, reference)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (reference) DO NOTHING;
    `;

        for (const ad of adsDataToInsert) {
            try {
                console.log(`Insertion de l'annonce avec référence ${ad.reference}`);
                const values = [
                    ad.category, ad.subcategory, ad.title, ad.description,
                    ad.contact, ad.price, ad.location, ad.reference
                ];
                const res = await pool.query(insertQuery, values);
                // res.rowCount sera 1 si une ligne est insérée, 0 si le conflit a empêché l'insertion.
                if (res.rowCount > 0) {
                    insertedCount++;
                }
            } catch (dbError) {
                console.error(`Erreur lors de l'insertion de l'annonce avec référence ${ad.reference}:`, dbError);
            }
        }
        console.log(`Insertion terminée. ${insertedCount} nouvelle(s) annonce(s) ajoutée(s) à la base de données.`);
    }

    await pool.end(); // Ferme toutes les connexions du pool proprement
}

main().catch(err => {
    console.error("Une erreur globale est survenue dans le script:", err);
    pool.end();
});