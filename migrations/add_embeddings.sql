-- Migration pour ajouter le support des embeddings vectoriels
-- Nécessite l'extension pgvector

-- Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Ajouter la colonne embedding à la table annonces
-- Dimension 768 correspond à text-embedding-004 de Google Gemini
ALTER TABLE annonces
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Créer un index HNSW pour la recherche rapide par similarité cosinus
-- HNSW (Hierarchical Navigable Small World) est optimal pour les grandes bases
CREATE INDEX IF NOT EXISTS idx_annonces_embedding
ON annonces
USING hnsw (embedding vector_cosine_ops);

-- Commentaires pour documentation
COMMENT ON COLUMN annonces.embedding IS 'Vecteur d''embedding (768 dim) généré par Gemini text-embedding-004 pour recherche sémantique';
COMMENT ON INDEX idx_annonces_embedding IS 'Index HNSW pour recherche vectorielle rapide par similarité cosinus';

-- Vérification
SELECT
  'Extension pgvector activée' as status,
  EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) as installed;

SELECT
  'Colonne embedding créée' as status,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'annonces' AND column_name = 'embedding'
  ) as created;
