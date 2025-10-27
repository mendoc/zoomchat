import pg from 'pg';

const { Pool } = pg;

// Configuration du pool de connexion PostgreSQL
let pool = null;

/**
 * Initialise la connexion à la base de données
 * @returns {Pool} Instance du pool PostgreSQL
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

/**
 * Initialise toutes les tables de la base de données si elles n'existent pas
 */
export async function initDatabase() {
  const client = getPool();

  try {
    // Table subscribers
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id SERIAL PRIMARY KEY,
        chat_id BIGINT UNIQUE NOT NULL,
        nom TEXT,
        telephone TEXT,
        date_abonnement TIMESTAMP DEFAULT NOW(),
        actif BOOLEAN DEFAULT TRUE
      )
    `);

    // Index pour la table subscribers
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscribers_chat_id ON subscribers(chat_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subscribers_actif ON subscribers(actif)
    `);

    console.log('✅ Table subscribers initialisée');

    // Table parutions
    await client.query(`
      CREATE TABLE IF NOT EXISTS parutions (
        id SERIAL PRIMARY KEY,
        numero VARCHAR(10) UNIQUE NOT NULL,
        periode TEXT NOT NULL,
        pdf_url TEXT NOT NULL,
        telegram_file_id TEXT NOT NULL,
        date_parution DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index pour la table parutions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_parutions_numero ON parutions(numero)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_parutions_date ON parutions(date_parution)
    `);

    console.log('✅ Table parutions initialisée');

    // Table envois
    await client.query(`
      CREATE TABLE IF NOT EXISTS envois (
        id SERIAL PRIMARY KEY,
        parution_id INTEGER REFERENCES parutions(id) ON DELETE CASCADE,
        subscriber_id INTEGER REFERENCES subscribers(id) ON DELETE CASCADE,
        statut VARCHAR(20) NOT NULL CHECK (statut IN ('success', 'failed')),
        error_message TEXT,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index pour la table envois
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_envois_parution ON envois(parution_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_envois_subscriber ON envois(subscriber_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_envois_statut ON envois(statut)
    `);

    console.log('✅ Table envois initialisée');

    // Table annonces
    await client.query(`
      CREATE TABLE IF NOT EXISTS annonces (
        id SERIAL PRIMARY KEY,
        parution_id INTEGER REFERENCES parutions(id) ON DELETE CASCADE,
        category TEXT,
        subcategory TEXT,
        title TEXT,
        description TEXT,
        contact TEXT,
        price TEXT,
        location TEXT,
        reference TEXT UNIQUE NOT NULL,
        search_vector TSVECTOR GENERATED ALWAYS AS (
          to_tsvector('french',
            coalesce(title, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(category, '') || ' ' ||
            coalesce(subcategory, '') || ' ' ||
            coalesce(contact, '') || ' ' ||
            coalesce(location, '')
          )
        ) STORED,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Index pour la table annonces
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_annonces_parution_id ON annonces(parution_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_annonces_search_vector ON annonces USING GIN(search_vector)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_annonces_category ON annonces(category)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_annonces_reference ON annonces(reference)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_annonces_location ON annonces(location)
    `);

    console.log('✅ Table annonces initialisée');
    console.log('✅ Base de données initialisée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

/**
 * Ajoute un nouvel abonné à la base de données
 * @param {number} chatId - L'ID du chat Telegram
 * @param {string} nom - Le nom de l'utilisateur
 * @param {string} telephone - Le numéro de téléphone
 * @returns {Promise<object>} L'abonné créé
 */
export async function addSubscriber(chatId, nom, telephone) {
  const client = getPool();

  try {
    const result = await client.query(
      `INSERT INTO subscribers (chat_id, nom, telephone, actif)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (chat_id)
       DO UPDATE SET nom = $2, telephone = $3, actif = TRUE, date_abonnement = NOW()
       RETURNING *`,
      [chatId, nom, telephone]
    );

    console.log(`✅ Abonné ajouté: ${nom} (${chatId})`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'abonné:', error);
    throw error;
  }
}

/**
 * Désactive l'abonnement d'un utilisateur
 * @param {number} chatId - L'ID du chat Telegram
 * @returns {Promise<boolean>} True si l'abonnement a été désactivé
 */
export async function removeSubscriber(chatId) {
  const client = getPool();

  try {
    const result = await client.query(
      `UPDATE subscribers SET actif = FALSE WHERE chat_id = $1 AND actif = TRUE RETURNING *`,
      [chatId]
    );

    if (result.rows.length > 0) {
      console.log(`✅ Abonnement désactivé pour: ${chatId}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Erreur lors de la désactivation de l\'abonnement:', error);
    throw error;
  }
}

/**
 * Récupère les informations d'un abonné
 * @param {number} chatId - L'ID du chat Telegram
 * @returns {Promise<object|null>} Les informations de l'abonné ou null
 */
export async function getSubscriber(chatId) {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT * FROM subscribers WHERE chat_id = $1`,
      [chatId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de l\'abonné:', error);
    throw error;
  }
}

/**
 * Récupère tous les abonnés actifs
 * @returns {Promise<Array>} Liste de tous les abonnés actifs
 */
export async function getAllActiveSubscribers() {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT * FROM subscribers WHERE actif = TRUE ORDER BY date_abonnement DESC`
    );

    console.log(`📊 ${result.rows.length} abonnés actifs`);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des abonnés:', error);
    throw error;
  }
}

/**
 * Ferme la connexion à la base de données
 */
export async function closeDatabase() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 Connexion à la base de données fermée');
  }
}

/**
 * Ajoute une nouvelle parution à la base de données
 * @param {object} data - Les données de la parution
 * @param {string} data.numero - Numéro de la parution
 * @param {string} data.periode - Période de la parution
 * @param {string} data.pdfUrl - URL du PDF
 * @param {string} data.telegramFileId - File ID Telegram
 * @param {Date} data.dateParution - Date de parution (optionnel)
 * @returns {Promise<object>} La parution créée
 */
export async function addParution(data) {
  const client = getPool();

  try {
    const result = await client.query(
      `INSERT INTO parutions (numero, periode, pdf_url, telegram_file_id, date_parution)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (numero) DO UPDATE
       SET periode = $2, pdf_url = $3, telegram_file_id = $4, date_parution = $5
       RETURNING *`,
      [data.numero, data.periode, data.pdfUrl, data.telegramFileId, data.dateParution || new Date()]
    );

    console.log(`✅ Parution ajoutée: ${data.numero}`);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de la parution:', error);
    throw error;
  }
}

/**
 * Récupère une parution par son numéro
 * @param {string} numero - Le numéro de la parution
 * @returns {Promise<object|null>} La parution ou null
 */
export async function getParutionByNumero(numero) {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT * FROM parutions WHERE numero = $1`,
      [numero]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la parution:', error);
    throw error;
  }
}

/**
 * Enregistre un envoi dans l'historique
 * @param {number} parutionId - ID de la parution
 * @param {number} subscriberId - ID de l'abonné
 * @param {string} statut - Statut de l'envoi ('success' ou 'failed')
 * @param {string} errorMessage - Message d'erreur (optionnel)
 * @returns {Promise<object>} L'envoi enregistré
 */
export async function logEnvoi(parutionId, subscriberId, statut, errorMessage = null) {
  const client = getPool();

  try {
    const result = await client.query(
      `INSERT INTO envois (parution_id, subscriber_id, statut, error_message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [parutionId, subscriberId, statut, errorMessage]
    );

    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement de l\'envoi:', error);
    throw error;
  }
}

/**
 * Récupère les statistiques d'envoi pour une parution
 * @param {number} parutionId - ID de la parution
 * @returns {Promise<object>} Statistiques (total, success, failed)
 */
export async function getEnvoisByParution(parutionId) {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN statut = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN statut = 'failed' THEN 1 ELSE 0 END) as failed
       FROM envois
       WHERE parution_id = $1`,
      [parutionId]
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total) || 0,
      success: parseInt(stats.success) || 0,
      failed: parseInt(stats.failed) || 0
    };
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
}

/**
 * Récupère la dernière parution enregistrée
 * @returns {Promise<object|null>} La dernière parution ou null
 */
export async function getLatestParution() {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT * FROM parutions ORDER BY created_at DESC LIMIT 1`
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la dernière parution:', error);
    throw error;
  }
}

/**
 * Sauvegarde une annonce dans la base de données
 * @param {object} data - Les données de l'annonce
 * @param {number} data.parutionId - ID de la parution (requis)
 * @param {string} data.category - Catégorie de l'annonce
 * @param {string} data.subcategory - Sous-catégorie (optionnel)
 * @param {string} data.title - Titre de l'annonce (optionnel)
 * @param {string} data.reference - Référence unique (requis)
 * @param {string} data.description - Description complète
 * @param {string} data.contact - Informations de contact (optionnel)
 * @param {string} data.price - Prix (optionnel)
 * @param {string} data.location - Localisation (optionnel)
 * @returns {Promise<object>} L'annonce créée
 */
export async function saveAnnonce(data) {
  const client = getPool();

  try {
    const result = await client.query(
      `INSERT INTO annonces (
        parution_id, category, subcategory, title, reference, description,
        contact, price, location
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (reference) DO UPDATE SET
         parution_id = $1,
         category = $2,
         subcategory = $3,
         title = $4,
         description = $6,
         contact = $7,
         price = $8,
         location = $9
       RETURNING *`,
      [
        data.parutionId,
        data.category,
        data.subcategory,
        data.title,
        data.reference,
        data.description,
        data.contact,
        data.price,
        data.location
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout de l\'annonce:', error);
    throw error;
  }
}

/**
 * Recherche des annonces par mots-clés avec Full-Text Search
 * @param {string} query - Requête de recherche
 * @param {number} limit - Nombre maximum de résultats (défaut: 10)
 * @returns {Promise<Array>} Liste des annonces trouvées
 */
export async function searchAnnonces(query, limit = 10) {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT *,
         ts_rank(search_vector, to_tsquery('french', $1)) as rank
       FROM annonces
       WHERE search_vector @@ to_tsquery('french', $1)
       ORDER BY rank DESC, created_at DESC
       LIMIT $2`,
      [query.split(' ').join(' & '), limit]
    );

    console.log(`🔍 ${result.rows.length} annonces trouvées pour: "${query}"`);
    return result.rows;
  } catch (error) {
    // Fallback vers recherche ILIKE si la recherche FTS échoue
    console.warn('⚠️ Erreur recherche FTS, fallback vers ILIKE:', error.message);
    try {
      const result = await client.query(
        `SELECT * FROM annonces
         WHERE
           title ILIKE $1 OR
           description ILIKE $1 OR
           category ILIKE $1 OR
           subcategory ILIKE $1 OR
           contact ILIKE $1 OR
           location ILIKE $1 OR
           reference ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [`%${query}%`, limit]
      );
      console.log(`🔍 ${result.rows.length} annonces trouvées pour: "${query}" (ILIKE)`);
      return result.rows;
    } catch (fallbackError) {
      console.error('❌ Erreur lors de la recherche d\'annonces:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Récupère toutes les annonces d'une parution spécifique
 * @param {number} parutionId - ID de la parution
 * @returns {Promise<Array>} Liste des annonces de la parution
 */
export async function getAnnoncesByParution(parutionId) {
  const client = getPool();

  try {
    const result = await client.query(
      `SELECT * FROM annonces WHERE parution_id = $1 ORDER BY created_at DESC`,
      [parutionId]
    );

    console.log(`📊 ${result.rows.length} annonces trouvées pour la parution ${parutionId}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des annonces par parution:', error);
    throw error;
  }
}
