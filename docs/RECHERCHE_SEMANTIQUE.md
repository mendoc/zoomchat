# Recherche Sémantique avec Embeddings

Ce document explique le système de recherche hybride basé sur les embeddings vectoriels implémenté dans ZoomChat.

## Vue d'ensemble

Le système combine deux techniques de recherche :
1. **Recherche vectorielle (embeddings)** : Comprend l'intention et les synonymes
2. **Full-Text Search PostgreSQL** : Trouve les correspondances exactes

Cette approche hybride offre le meilleur des deux mondes : compréhension du langage naturel ET recherche rapide par mots-clés.

## Architecture

### Composants

- **src/embeddingService.js** : Génération d'embeddings avec Gemini text-embedding-004
- **src/hybridSearch.js** : Logique de recherche hybride (70% embeddings + 30% FTS)
- **migrations/add_embeddings.sql** : Migration PostgreSQL (pgvector + colonne embedding)
- **scripts/generateEmbeddings.js** : Génération batch des embeddings
- **scripts/migratePgvector.js** : Script d'exécution de la migration

### Modèle d'Embedding

- **Modèle** : Google Gemini `text-embedding-004`
- **Dimensions** : 768
- **Coût** : Gratuit jusqu'à 1500 req/min (~$0.003 pour 1000 recherches)
- **Support** : Multilingue (excellent en français)

### Base de Données

```sql
-- Extension
CREATE EXTENSION vector;

-- Colonne
ALTER TABLE annonces ADD COLUMN embedding vector(768);

-- Index HNSW pour recherche rapide
CREATE INDEX idx_annonces_embedding ON annonces USING hnsw (embedding vector_cosine_ops);
```

## Installation

### 1. Exécuter la migration

```bash
node scripts/migratePgvector.js
```

Cette commande :
- Active l'extension pgvector
- Ajoute la colonne `embedding` à la table `annonces`
- Crée l'index HNSW pour la recherche rapide

### 2. Générer les embeddings pour les annonces existantes

```bash
node scripts/generateEmbeddings.js
```

Cette commande :
- Récupère toutes les annonces sans embedding
- Génère l'embedding pour chaque annonce (texte composite)
- Sauvegarde les embeddings en base
- Affiche la progression en temps réel

**Temps estimé** : ~1 annonce/seconde (~3 minutes pour 180 annonces)

### 3. Régénérer des embeddings spécifiques (optionnel)

```bash
node scripts/generateEmbeddings.js --ids 123 456 789
```

## Utilisation

### Recherche depuis le bot Telegram

Les utilisateurs peuvent saisir directement leur recherche en langage naturel :

**Exemples** :
```
Je cherche une maison à louer au PK8
studio meublé Libreville
Toyota occasion
cherche ménagère
terrain à vendre Ntoum
emploi chauffeur
```

Le bot :
1. Génère l'embedding de la requête
2. Effectue une recherche hybride (vectorielle + FTS)
3. Retourne les 10 résultats les plus pertinents
4. Affiche le score de pertinence (0-100%)

### Recherche programmatique

```javascript
import { hybridSearch } from './hybridSearch.js';

const results = await hybridSearch('maison à louer au PK8', {
  limit: 10,
  vectorWeight: 0.7,  // 70% pour les embeddings
  ftsWeight: 0.3,     // 30% pour FTS
  minScore: 0.3       // Score minimum (0-1)
});

// Résultats triés par pertinence décroissante
results.forEach(annonce => {
  console.log(`${annonce.title} - Score: ${annonce.combined_score}`);
});
```

## Fonctionnement Détaillé

### 1. Génération d'Embedding

Chaque annonce est convertie en un **texte composite** :

```javascript
function createCompositeText(annonce) {
  return [
    annonce.category,        // Ex: "Immobilier"
    annonce.subcategory,     // Ex: "Location"
    annonce.title,           // Ex: "Studio meublé PK8"
    `à ${annonce.location}`, // Ex: "à PK8"
    `prix ${annonce.price}`, // Ex: "prix 150 000 FCFA"
    annonce.description      // Tronquée à 500 caractères
  ].join(' ');
}
```

Ce texte est ensuite envoyé à Gemini text-embedding-004 qui retourne un vecteur de 768 dimensions.

### 2. Recherche Hybride

```sql
WITH vector_search AS (
  -- Top 20 par similarité cosinus
  SELECT *, (1 - (embedding <=> $query_embedding)) as vector_score
  FROM annonces
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> $query_embedding
  LIMIT 20
),
fts_search AS (
  -- Top 20 par FTS
  SELECT *, ts_rank(search_vector, to_tsquery('french', $query)) as fts_score
  FROM annonces
  WHERE search_vector @@ to_tsquery('french', $query)
  ORDER BY fts_score DESC
  LIMIT 20
),
combined AS (
  -- Fusion pondérée
  SELECT
    *,
    (vector_score * 0.7 + fts_score * 0.3) as combined_score
  FROM vector_search FULL OUTER JOIN fts_search USING (id)
)
SELECT * FROM combined
WHERE combined_score >= 0.3
ORDER BY combined_score DESC
LIMIT 10
```

### 3. Gestion des Cas d'Erreur

- **Erreur génération embedding** : L'annonce est sauvegardée sans embedding (recherche FTS uniquement)
- **Erreur FTS (syntax)** : Fallback vers recherche vectorielle seule
- **Aucun résultat** : Message d'aide à l'utilisateur

## Avantages

### ✅ Tolérance aux fautes d'orthographe

```
Requête : "maisson a loué au pk8"
Résultats : Trouve "Maison à louer PK 8.5" (score: 0.92)
```

### ✅ Compréhension des synonymes

```
Requête : "location studio"
Résultats : Trouve aussi "Studio à louer" (synonyme implicite)
```

### ✅ Compréhension contextuelle

```
Requête : "Je cherche un logement meublé au centre ville"
Résultats : Trouve "Studio meublé Libreville centre" même sans correspondance exacte
```

### ✅ Performance

- **Index HNSW** : Recherche en < 50ms sur 10 000+ annonces
- **Cache automatique** : PostgreSQL met en cache les requêtes fréquentes
- **Scalabilité** : Fonctionne jusqu'à des millions d'annonces

## Maintenance

### Régénérer tous les embeddings

Utile après un changement de modèle ou de stratégie de texte composite :

```bash
# 1. Supprimer tous les embeddings
psql $DATABASE_URL -c "UPDATE annonces SET embedding = NULL"

# 2. Régénérer
node scripts/generateEmbeddings.js
```

### Surveiller la qualité

```sql
-- Annonces sans embedding
SELECT COUNT(*) FROM annonces WHERE embedding IS NULL;

-- Distribution des scores pour une requête
SELECT
  ROUND(combined_score, 1) as score_range,
  COUNT(*) as count
FROM (
  SELECT (1 - (embedding <=> '[...]')) as combined_score
  FROM annonces
  WHERE embedding IS NOT NULL
) t
GROUP BY score_range
ORDER BY score_range DESC;
```

## Coûts

### API Gemini

- **Gratuit** : 1500 requêtes/minute
- **Payant** : $0.000025/1000 tokens après quota gratuit

**Exemple** : 180 annonces × 100 tokens = 18 000 tokens = $0.00045 (~0.4 centimes)

### PostgreSQL

- **Stockage** : 768 floats × 4 bytes = 3 KB par annonce
- **Index HNSW** : ~2× la taille des données (~6 KB par annonce)

**Total** : 180 annonces × 9 KB = ~1.6 MB (négligeable)

## Optimisations Futures

1. **Cache des embeddings de requêtes** : Stocker les embeddings des requêtes fréquentes
2. **Filtres avancés** : Recherche par catégorie + embeddings
3. **Réranking** : Utiliser un modèle de cross-encoding pour affiner les résultats
4. **Feedback utilisateur** : Apprendre des clics pour améliorer le ranking

## Troubleshooting

### Erreur : `extension "vector" does not exist`

L'extension pgvector n'est pas installée. Contactez l'administrateur de la base de données.

### Erreur : `column "embedding" does not exist`

La migration n'a pas été exécutée. Lancez `node scripts/migratePgvector.js`.

### Aucun résultat avec `minScore`

Le score minimum est trop élevé. Essayez `minScore: 0.2` ou `minScore: 0.1`.

### Recherche lente

Vérifiez que l'index HNSW existe :

```sql
SELECT * FROM pg_indexes WHERE tablename = 'annonces' AND indexname = 'idx_annonces_embedding';
```

## Références

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings)
- [HNSW Algorithm](https://arxiv.org/abs/1603.09320)
