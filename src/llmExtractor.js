import OpenAI from 'openai';

/**
 * Module d'extraction d'annonces via LLM (GPT-4o-mini)
 * Analyse visuellement les pages PDF pour extraire les annonces structurées
 */

// Initialisation du client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Prompt système pour guider l'extraction des annonces
 */
const EXTRACTION_PROMPT = `Tu es un expert en extraction de données depuis des petites annonces du magazine gabonais "Zoom Hebdo".

Ta tâche est d'analyser visuellement une page de magazine et d'extraire TOUTES les annonces présentes.

**IMPORTANT - Gestion du multi-colonnes:**
- Les annonces peuvent commencer dans une colonne et continuer dans la colonne suivante
- Reconstruit le texte complet de chaque annonce en suivant l'ordre de lecture naturel
- Chaque annonce se termine par une référence unique entre parenthèses (exemple: GA001 251016 L0005)

**Structure d'une annonce:**
- **Catégorie** : Emploi, Véhicule, Immobilier, Objet, People, etc.
- **Titre** : Titre principal en majuscules (ex: "VEND RENAULT DUSTER")
- **Référence** : Code unique entre parenthèses (ex: "GA001 251016 E0004")
- **Description** : Texte complet de l'annonce
- **Téléphone** : Un ou plusieurs numéros (format: XXX XX XX XX)
- **Prix** : Montant en FCFA si mentionné (ex: "3 800 000 FCFA")
- **Localisation** : Ville/quartier mentionné (Libreville, Owendo, Nzeng-Ayong, etc.)
- **Type de bien/service** : Catégorisation précise (Studio, Villa, Toyota, Emploi CDI, etc.)
- **Email** : Adresse email si présente

**Pages à ignorer** (retourner has_annonces: false):
- Pages de couverture
- Pages publicitaires pleine page
- Pages "Agenda Events"
- Pages avec uniquement des images promotionnelles
- Dernière page (généralement vide ou pub)

**Format de sortie JSON:**
\`\`\`json
{
  "has_annonces": true,
  "annonces": [
    {
      "categorie": "Véhicule",
      "titre": "VEND RENAULT DUSTER",
      "reference": "GA001 251014 E0004",
      "description": "VEND RENAULT DUESTER bon état général - Prix : 3 800 000 FCFA à débattre - Tel. 074 57 23 36",
      "telephone": "074 57 23 36",
      "prix": "3 800 000 FCFA",
      "localisation": null,
      "type_bien_service": "Renault Duster",
      "email": null
    }
  ]
}
\`\`\`

Réponds UNIQUEMENT avec du JSON valide, sans texte avant ou après.`;

/**
 * Extrait les annonces d'une image de page PDF via GPT-4o-mini
 * @param {string} base64Image - Image de la page en base64
 * @param {number} pageNumber - Numéro de la page (pour logging)
 * @returns {Promise<{has_annonces: boolean, annonces: Array}>}
 */
export async function extractAnnoncesFromPage(base64Image, pageNumber) {
  try {
    console.log(`🤖 Analyse LLM de la page ${pageNumber}...`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: EXTRACTION_PROMPT
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyse cette page du magazine Zoom Hebdo et extrais toutes les annonces présentes. Page ${pageNumber}.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
                detail: 'high' // Haute résolution pour bien lire le texte
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Faible température pour résultats déterministes
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.warn(`⚠️ Pas de réponse du LLM pour la page ${pageNumber}`);
      return { has_annonces: false, annonces: [] };
    }

    const result = JSON.parse(content);

    if (result.has_annonces) {
      console.log(`✅ Page ${pageNumber}: ${result.annonces.length} annonces trouvées`);
    } else {
      console.log(`⏭️ Page ${pageNumber}: Aucune annonce (page pub/agenda)`);
    }

    return result;

  } catch (error) {
    console.error(`❌ Erreur LLM page ${pageNumber}:`, error.message);

    // En cas d'erreur, retourner une structure vide plutôt que crasher
    return { has_annonces: false, annonces: [] };
  }
}

/**
 * Extrait les annonces de toutes les pages d'un PDF
 * @param {Array<string>} base64Images - Array d'images base64 (une par page)
 * @returns {Promise<Array>} Liste de toutes les annonces extraites
 */
export async function extractAllAnnonces(base64Images) {
  console.log(`\n🚀 Démarrage de l'extraction LLM pour ${base64Images.length} pages...\n`);

  const allAnnonces = [];
  let pagesAvecAnnonces = 0;
  let totalAnnonces = 0;

  // Traiter les pages séquentiellement pour respecter les limites de rate
  for (let i = 0; i < base64Images.length; i++) {
    const pageNumber = i + 1;
    const result = await extractAnnoncesFromPage(base64Images[i], pageNumber);

    if (result.has_annonces && result.annonces.length > 0) {
      pagesAvecAnnonces++;
      totalAnnonces += result.annonces.length;
      allAnnonces.push(...result.annonces);
    }

    // Petite pause entre les requêtes pour éviter le rate limiting
    if (i < base64Images.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📊 Extraction terminée:`);
  console.log(`   - ${pagesAvecAnnonces}/${base64Images.length} pages avec annonces`);
  console.log(`   - ${totalAnnonces} annonces extraites au total\n`);

  return allAnnonces;
}

/**
 * Valide et nettoie les données d'une annonce
 * @param {object} annonce - Annonce brute extraite par le LLM
 * @returns {object} Annonce nettoyée
 */
export function cleanAnnonce(annonce) {
  return {
    categorie: annonce.categorie?.trim() || 'Autre',
    titre: annonce.titre?.trim() || null,
    reference: annonce.reference?.trim() || null,
    description: annonce.description?.trim() || annonce.texteComplet?.trim() || '',
    telephone: annonce.telephone?.trim() || null,
    prix: annonce.prix?.trim() || null,
    localisation: annonce.localisation?.trim() || null,
    type_bien_service: annonce.type_bien_service?.trim() || null,
    email: annonce.email?.trim() || null
  };
}
