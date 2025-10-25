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
 * Initialise la table subscribers si elle n'existe pas
 */
export async function initDatabase() {
  const client = getPool();

  try {
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

    console.log('✅ Table subscribers initialisée');
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
