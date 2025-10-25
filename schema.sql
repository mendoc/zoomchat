-- Schéma de la base de données pour ZoomChat
-- Ce script crée la table subscribers pour stocker les abonnés

CREATE TABLE IF NOT EXISTS subscribers (
  id SERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  nom TEXT,
  telephone TEXT,
  date_abonnement TIMESTAMP DEFAULT NOW(),
  actif BOOLEAN DEFAULT TRUE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_subscribers_chat_id ON subscribers(chat_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_actif ON subscribers(actif);

-- Commentaires sur les colonnes
COMMENT ON COLUMN subscribers.chat_id IS 'ID unique du chat Telegram de l''utilisateur';
COMMENT ON COLUMN subscribers.nom IS 'Nom complet de l''utilisateur (récupéré depuis Telegram)';
COMMENT ON COLUMN subscribers.telephone IS 'Numéro de téléphone de l''utilisateur';
COMMENT ON COLUMN subscribers.date_abonnement IS 'Date et heure de l''abonnement';
COMMENT ON COLUMN subscribers.actif IS 'Indique si l''abonnement est actif (false si désabonné)';
