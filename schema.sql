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

-- Table pour stocker les parutions du Zoom Hebdo
CREATE TABLE IF NOT EXISTS parutions (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(10) UNIQUE NOT NULL,
  periode TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  telegram_file_id TEXT NOT NULL,
  date_parution DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_parutions_numero ON parutions(numero);
CREATE INDEX IF NOT EXISTS idx_parutions_date ON parutions(date_parution);

-- Commentaires sur les colonnes
COMMENT ON COLUMN parutions.numero IS 'Numéro de la parution (ex: 1544)';
COMMENT ON COLUMN parutions.periode IS 'Période de la parution (ex: "12/01/2025 au 18/01/2025")';
COMMENT ON COLUMN parutions.pdf_url IS 'URL du PDF sur le site Zoom Hebdo';
COMMENT ON COLUMN parutions.telegram_file_id IS 'File ID Telegram pour réutilisation rapide';
COMMENT ON COLUMN parutions.date_parution IS 'Date de publication du magazine';

-- Table pour logger l'historique des envois
CREATE TABLE IF NOT EXISTS envois (
  id SERIAL PRIMARY KEY,
  parution_id INTEGER REFERENCES parutions(id) ON DELETE CASCADE,
  subscriber_id INTEGER REFERENCES subscribers(id) ON DELETE CASCADE,
  statut VARCHAR(20) NOT NULL CHECK (statut IN ('success', 'failed')),
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_envois_parution ON envois(parution_id);
CREATE INDEX IF NOT EXISTS idx_envois_subscriber ON envois(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_envois_statut ON envois(statut);

-- Commentaires sur les colonnes
COMMENT ON COLUMN envois.parution_id IS 'Référence vers la parution envoyée';
COMMENT ON COLUMN envois.subscriber_id IS 'Référence vers l''abonné destinataire';
COMMENT ON COLUMN envois.statut IS 'Statut de l''envoi (success ou failed)';
COMMENT ON COLUMN envois.error_message IS 'Message d''erreur en cas d''échec';
COMMENT ON COLUMN envois.sent_at IS 'Date et heure de l''envoi';

-- Table pour stocker les annonces extraites des parutions
CREATE TABLE IF NOT EXISTS annonces (
  id SERIAL PRIMARY KEY,
  parution_id INTEGER REFERENCES parutions(id) ON DELETE CASCADE,
  category TEXT,
  subcategory TEXT,
  title TEXT,
  reference TEXT UNIQUE NOT NULL,
  description TEXT,
  contact TEXT,
  price TEXT,
  location TEXT,
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
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_annonces_parution_id ON annonces(parution_id);
CREATE INDEX IF NOT EXISTS idx_annonces_category ON annonces(category);
CREATE INDEX IF NOT EXISTS idx_annonces_reference ON annonces(reference);
CREATE INDEX IF NOT EXISTS idx_annonces_location ON annonces(location);
CREATE INDEX IF NOT EXISTS idx_annonces_search_vector ON annonces USING GIN(search_vector);

-- Commentaires sur les colonnes
COMMENT ON COLUMN annonces.parution_id IS 'Référence vers la parution d''origine';
COMMENT ON COLUMN annonces.category IS 'Catégorie principale de l''annonce (Emploi, Véhicule, Immobilier, etc.)';
COMMENT ON COLUMN annonces.subcategory IS 'Sous-catégorie de l''annonce (ex: SCOLAIRE, HORECA, etc.)';
COMMENT ON COLUMN annonces.title IS 'Titre principal de l''annonce';
COMMENT ON COLUMN annonces.reference IS 'Référence unique de l''annonce (ex: GA001 251016 L0005)';
COMMENT ON COLUMN annonces.description IS 'Description complète de l''annonce';
COMMENT ON COLUMN annonces.contact IS 'Informations de contact complètes extraites de l''annonce';
COMMENT ON COLUMN annonces.price IS 'Prix mentionné dans l''annonce';
COMMENT ON COLUMN annonces.location IS 'Lieu géographique (ville, quartier)';
COMMENT ON COLUMN annonces.search_vector IS 'Vecteur de recherche full-text pour recherche optimisée';
