-- Migration: Ajout des champs subcategory, contact et parution_id à la table annonces
-- Date: 2025-01-27
-- Description: Mise à jour de la structure de la table annonces pour supporter l'extraction Gemini

-- Ajouter la colonne subcategory
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Ajouter la colonne contact
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS contact TEXT;

-- Ajouter la colonne parution_id avec foreign key vers parutions
ALTER TABLE annonces ADD COLUMN IF NOT EXISTS parution_id INTEGER REFERENCES parutions(id) ON DELETE CASCADE;

-- Créer un index sur parution_id pour améliorer les performances des jointures
CREATE INDEX IF NOT EXISTS idx_annonces_parution_id ON annonces(parution_id);

-- Mettre à jour la colonne search_vector pour inclure subcategory et contact dans la recherche full-text
ALTER TABLE annonces DROP COLUMN IF EXISTS search_vector;
ALTER TABLE annonces ADD COLUMN search_vector TSVECTOR GENERATED ALWAYS AS (
  to_tsvector('french',
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(subcategory, '') || ' ' ||
    coalesce(contact, '') || ' ' ||
    coalesce(location, '')
  )
) STORED;

-- Recréer l'index GIN sur search_vector
CREATE INDEX IF NOT EXISTS idx_annonces_search_vector ON annonces USING GIN(search_vector);

-- Ajouter des commentaires sur les nouvelles colonnes
COMMENT ON COLUMN annonces.subcategory IS 'Sous-catégorie de l''annonce (ex: SCOLAIRE, HORECA, etc.)';
COMMENT ON COLUMN annonces.contact IS 'Informations de contact complètes extraites de l''annonce';
COMMENT ON COLUMN annonces.parution_id IS 'Référence vers la parution d''origine de cette annonce';

-- Afficher un message de succès
DO $$
BEGIN
  RAISE NOTICE 'Migration terminée avec succès !';
  RAISE NOTICE 'Colonnes ajoutées: subcategory, contact, parution_id';
  RAISE NOTICE 'Index créés: idx_annonces_parution_id, idx_annonces_search_vector';
END $$;
