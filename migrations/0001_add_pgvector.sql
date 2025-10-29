-- Migration to enable pgvector extension and create HNSW index for embeddings

-- Activer l'extension pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Créer l'index HNSW pour les embeddings (recherche vectorielle rapide)
CREATE INDEX IF NOT EXISTS idx_annonces_embedding
ON annonces
USING hnsw (embedding vector_cosine_ops);
