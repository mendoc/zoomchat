import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool();

// Liste simple de mots courants français à ignorer
const STOP_WORDS = new Set([
    'a', 'à', 'alors', 'au', 'aucuns', 'aussi', 'autre', 'avec', 'car', 'ce',
    'comme', 'dans', 'de', 'des', 'du', 'elle', 'en', 'est', 'et', 'eux',
    'il', 'ils', 'je', 'la', 'le', 'les', 'leur', 'lui', 'ma', 'mais', 'me',
    'même', 'mes', 'moi', 'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou',
    'par', 'pas', 'pour', 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur',
    'ta', 'te', 'tes', 'toi', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous',
    'cherche', 'trouver', 'aimerais', 'voudrais'
]);

/**
 * Prend une requête en langage naturel et la transforme en une chaîne pour ts_query.
 * @param {string} naturalQuery La phrase de l'utilisateur.
 * @returns {string} Une chaîne formatée pour to_tsquery, ex: "voiture & toyota".
 */
function processNaturalQuery(naturalQuery) {
    if (!naturalQuery || typeof naturalQuery !== 'string') {
        return '';
    }

    const keywords = naturalQuery
        .toLowerCase()
        .split(/\s+/) // Sépare par les espaces
        .filter(word => word.length > 2 && !STOP_WORDS.has(word)); // Enlève les mots courts et les stop words

    return keywords.join(' & '); // Combine les mots-clés avec 'ET'
}

async function searchAnnonces(query) {
    const tsQueryString = processNaturalQuery(query);

    if (!tsQueryString) {
        console.log("Requête invalide ou vide après nettoyage.");
        return [];
    }

    console.log(`Requête de l'utilisateur: "${query}"`);
    console.log(`Termes de recherche pour Postgres: "${tsQueryString}"`);

    const searchQuery = `
    SELECT 
        id, 
        title, 
        description, 
        location,
        price,
        ts_rank_cd(search_vector, to_tsquery('french', $1)) AS rank
    FROM 
        annonces
    WHERE 
        search_vector @@ to_tsquery('french', $1)
    ORDER BY 
        rank DESC
    LIMIT 10; -- On limite le nombre de résultats
  `;

    try {
        const { rows } = await pool.query(searchQuery, [tsQueryString]);
        return rows;
    } catch (err) {
        console.error("Erreur lors de la recherche en base de données :", err);
        return [];
    }
}

// --- SIMULATION D'UNE RECHERCHE UTILISATEUR ---
async function runSearch(userQuery) {
    const results = await searchAnnonces(userQuery);

    console.log("\n--- RÉSULTATS DE LA RECHERCHE ---");
    if (results.length === 0) {
        console.log("Aucune annonce correspondante trouvée.");
    } else {
        results.forEach(ad => {
            console.log(`
        ID: ${ad.id} (Pertinence: ${ad.rank.toFixed(4)})
        Titre: ${ad.title}
        Lieu: ${ad.location}
        Prix: ${ad.price || 'Non spécifié'}
        Description: ${ad.description.substring(0, 100)}...
      `);
        });
    }

    await pool.end();
}

const userQuery = "je cherche une maison à louer dans nzeng-ayong";

runSearch(userQuery);