# Roadmap du projet ZoomChat

**ZoomChat** est un assistant virtuel Telegram conçu pour faciliter la recherche de petites annonces dans le magazine Zoom Hebdo, publication N°1 d'annonces contrôlées au Gabon.

---

## ✅ Fonctionnalités actuelles

Le système est actuellement opérationnel avec les fonctionnalités suivantes :

### Gestion des abonnements
- **Abonnement aux notifications** : Les utilisateurs peuvent s'abonner via `/abonner` ou le bouton inline pour recevoir automatiquement le PDF chaque vendredi
- **Désabonnement** : Possibilité de se désabonner à tout moment via `/desabonner`
- **Notifications administrateur** : L'admin reçoit des alertes en temps réel lors des abonnements/désabonnements (nom, username, chat ID, statistiques)

### Distribution automatique
- **Réception du PDF par email** : Le système surveille automatiquement les emails de Zoom Hebdo
- **Envoi automatisé** : Chaque vendredi, le nouveau numéro est automatiquement envoyé à tous les abonnés via Telegram

### Infrastructure
- **Domaine personnalisé** : Utilisation d'un sous-domaine personnalisé pour les webhooks du bot
- **Base de données PostgreSQL** : Stockage sécurisé des abonnés avec gestion des états (actif/inactif)
- **Déploiement Cloud** : Hébergement sur GCP Cloud Run pour une haute disponibilité

---

## ✅ Fonctionnalités récentes (v1.9.0)

### 🔍 Recherche et consultation

#### ✅ Extraction automatique des annonces
Système d'extraction LLM avec Google Gemini 2.5 Flash pour analyser le contenu PDF et extraire automatiquement les annonces.

**Implémentation** :
- **Parser PDF intelligent** : Utilise Gemini 2.5 Flash pour comprendre les layouts multi-colonnes
- **Extraction structurée** : Catégorie, sous-catégorie, titre, référence, description, contact, prix, localisation
- **Gestion robuste** : Retry automatique avec backoff exponentiel (1s, 3s, 10s) en cas de surcharge
- **Pages ciblées** : Traite uniquement les pages 1, 3, 5, 6, 7 (pages contenant des annonces)
- **Base de données** : Table `annonces` avec tous les champs structurés
- **Notifications admin** : L'admin reçoit un rapport détaillé après chaque extraction

#### ✅ Recherche sémantique hybride
Recherche intelligente combinant similarité vectorielle et Full-Text Search pour des résultats ultra-pertinents.

**Technologies implémentées** :
- **Embeddings Gemini** : Modèle `gemini-embedding-001` (1536 dimensions tronquées depuis 3072)
- **PostgreSQL pgvector** : Extension pour recherche vectorielle avec opérateur de distance cosinus (`<=>`)
- **Recherche hybride** : Combine vector search (70%) + FTS (30%) avec score pondéré
- **Optimisations** : Index GIN sur `search_vector`, index IVFFlat sur `embedding`
- **Batch processing** : Génération d'embeddings par batch avec rate limiting (~1200 req/min)

**Utilisation** :
- Les utilisateurs envoient simplement leur recherche en langage naturel au bot
- Exemples : "Je cherche un studio à louer à Libreville", "Véhicules Toyota disponibles"
- Le système comprend le contexte et retourne les annonces les plus pertinentes

#### ✅ Consultation du dernier numéro
Commande `/dernier` implémentée pour recevoir immédiatement la dernière parution disponible, même sans abonnement.

## 🚧 Prochaines fonctionnalités

### 🔔 Système d'alertes personnalisées (Priorité haute)

Permettre aux utilisateurs de définir des critères de recherche et recevoir des notifications automatiques lorsqu'une annonce correspondante est publiée.

**Fonctionnalités prévues** :
- Création d'alertes en langage naturel (ex: "alerte-moi pour tout studio à Libreville sous 200k")
- Stockage des embeddings de requêtes pour matching automatique
- Vérification automatique lors de l'extraction de nouvelles annonces
- Notifications push instantanées avec score de pertinence
- Gestion des alertes : liste, modification, désactivation

**Architecture technique** :
- Table `alertes` : user_id, query_text, query_embedding, criteria_json, active, created_at
- Lors de l'extraction PDF : calcul de similarité avec toutes les alertes actives
- Notification si score > seuil défini (ex: 0.75)
- Script de matching automatique intégré dans le workflow d'extraction

**Commandes prévues** :
- `/alerte` + description : Créer une nouvelle alerte
- `/alertes` : Voir toutes ses alertes actives
- `/alerte_stop [id]` : Désactiver une alerte

---

## 🎯 Améliorations UX (Priorité moyenne)

### Expérience utilisateur optimisée
- **Limitation des messages** : Imposer une taille maximale pour les messages utilisateurs afin d'éviter les abus et améliorer les performances
- **Accueil amélioré** : Lors du premier `/start`, proposer automatiquement de recevoir le dernier numéro publié pour faciliter la découverte du service
- **Pagination des résultats** : Implémenter un système de navigation par pages pour les recherches retournant plus de 10 résultats
- **Filtres avancés** : Ajouter des boutons inline pour filtrer par catégorie, fourchette de prix, localisation
- **Historique de recherche** : Permettre aux utilisateurs de voir leurs dernières recherches et les relancer rapidement
- **Mode conversationnel** : Améliorer le dialogue pour affiner progressivement les critères de recherche

---

## 🛠️ Infrastructure & DevOps

### ✅ Réalisé

- **✅ Versionnage sémantique** : Système complet basé sur les commits conventionnels avec `standard-version`
  - Détection automatique du type de version (MAJOR, MINOR, PATCH)
  - Génération automatique de CHANGELOG.md
  - Scripts npm pour les releases
  - Documentation complète dans CONTRIBUTING.md

- **✅ Déploiement manuel optimisé** : Script `npm run deploy`
  - Build de l'image Docker avec numéro de version
  - Push vers Google Container Registry (GCR)
  - Déploiement sur Cloud Run avec révision versionnée
  - Variables d'environnement sécurisées via `env.yaml`
  - Région : europe-west1
  - Note : Déploiement automatique via Cloud Build désactivé (déploiement manuel uniquement)

- **✅ Extension PostgreSQL** : pgvector installée
  - Recherche vectorielle activée avec opérateur `<=>`
  - Support des embeddings 1536 dimensions
  - Index IVFFlat pour performances optimales

### 🚧 À venir (Priorité basse)

- **Tests automatisés** : Ajouter des tests unitaires et d'intégration
  - Tests avec Jest ou Mocha
  - Exécution avant chaque déploiement
  - Coverage minimum requis
  - Tests de régression sur l'extraction

- **Monitoring et alertes** : Surveillance de la production
  - Métriques Cloud Run (CPU, mémoire, latence)
  - Alertes sur erreurs d'extraction
  - Dashboard de monitoring
  - Logs centralisés avec filtrage avancé
  - Tracking des taux de succès d'extraction

- **CI/CD amélioré** : Pipeline automatisé
  - Déploiement automatique sur merge vers `main`
  - Environnement de staging pour validation
  - Rollback automatique en cas d'erreur

---

## 🏗️ Refactoring & Architecture (Priorité basse)

### Architecture actuelle

**Structure monolithique bien organisée** :
```
zoomchat/
├── src/
│   ├── bot.js                # Commandes et logique Telegram
│   ├── index.js              # Entry point et webhook handler
│   ├── database.js           # Opérations PostgreSQL
│   ├── geminiExtractor.js    # Extraction LLM avec Gemini
│   ├── embeddingService.js   # Génération d'embeddings
│   ├── hybridSearch.js       # Recherche vectorielle + FTS
│   ├── pdfSplitter.js        # Manipulation PDF
│   └── massNotify.js         # Envoi en masse aux abonnés
├── scripts/                  # Scripts CLI (extraction, recherche, migration)
└── docs/                     # Documentation du projet
```

Cette architecture fonctionne bien pour l'échelle actuelle du projet.

### Modularisation future (si nécessaire)

Si le projet atteint une échelle nécessitant une séparation des services (ex: > 10k utilisateurs actifs), envisager :

**Architecture microservices** :
```
zoomchat/
├── services/
│   ├── bot-service/          # Gestion des commandes Telegram
│   ├── extraction-service/   # Extraction PDF et génération d'embeddings
│   ├── search-service/       # Moteur de recherche hybride
│   ├── alert-service/        # Matching d'alertes et notifications
│   └── notification-service/ # Envois massifs aux abonnés
├── shared/                   # Code partagé (utils, types, config)
└── infrastructure/           # Terraform, K8s, CI/CD
```

**Bénéfices attendus** :
- Scalabilité horizontale indépendante par service
- Isolation des erreurs (ex: panne d'extraction n'affecte pas les recherches)
- Déploiement indépendant des services
- Optimisation des ressources (ex: GPU pour extraction uniquement)

**Quand déclencher cette migration** :
- Charge > 50 req/s sur le bot
- Base de données > 500k annonces
- Temps d'extraction > 5 min par PDF
- Besoin de scaling horizontal

---

## 📊 Métriques et suivi

### État actuel du projet (v1.9.0)

**Fonctionnalités complètes** :
- ✅ Abonnements et notifications automatiques
- ✅ Distribution PDF par email et Telegram
- ✅ Extraction automatique des annonces (LLM Gemini)
- ✅ Recherche sémantique hybride (vectorielle + FTS)
- ✅ Consultation du dernier numéro (`/dernier`)
- ✅ Infrastructure de déploiement et versionnement

**Composants implémentés** :
- 10 fichiers source (bot, database, extraction, search, embeddings...)
- 15+ scripts utilitaires (migration, test, extraction, recherche...)
- Base de données PostgreSQL avec 4 tables (subscribers, parutions, annonces, envois)
- Extension pgvector pour recherche vectorielle
- Support embeddings 1536 dimensions

**Prochaines étapes** :
1. **Priorité haute** : Système d'alertes personnalisées
2. **Priorité moyenne** : Améliorations UX (pagination, filtres, historique)
3. **Priorité basse** : Tests automatisés, monitoring, CI/CD

**Version suivante prévue** : v2.0.0 avec système d'alertes intelligentes

**Métriques techniques** :
- Temps d'extraction moyen : ~2-3 min par PDF (5 pages)
- Précision recherche : Score de pertinence > 70% pour requêtes typiques
- Rate limiting : ~1200 embeddings/min (sous limite Gemini de 1500/min)
- Disponibilité : 99.9% (Cloud Run)

---

*Dernière mise à jour : 28 octobre 2025*
