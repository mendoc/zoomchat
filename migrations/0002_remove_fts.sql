-- Migration: Suppression de la recherche Full-Text Search (FTS)
-- Date: 2025-10-29
-- Description: Suppression de la colonne search_vector et de l'index GIN associé
--              La recherche utilise désormais uniquement les embeddings vectoriels

-- Supprimer l'index GIN sur search_vector
DROP INDEX IF EXISTS idx_annonces_search_vector;

-- Supprimer la colonne search_vector (colonne générée)
ALTER TABLE annonces DROP COLUMN IF EXISTS search_vector;
