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

## 🚧 Prochaines fonctionnalités

### 🔍 Recherche et consultation (Priorité haute)

#### Extraction et indexation des annonces
Implémenter un système d'extraction automatique pour analyser le contenu de chaque PDF et enregistrer les annonces dans la base de données PostgreSQL.

**Détails techniques** :
- Parser le PDF pour extraire les annonces par catégorie (Immobilier, Véhicules, Emploi, etc.)
- Structurer les données : titre, description, prix, contact, catégorie
- Créer les tables `annonces` et `categories` dans la base de données
- Indexer les annonces pour une recherche efficace

#### Recherche en langage naturel
Permettre aux utilisateurs de dialoguer avec le bot pour trouver des annonces spécifiques.

**Exemples d'utilisation** :
- "Je cherche un studio à louer à Libreville"
- "Véhicules Toyota disponibles"
- "Offres d'emploi pour chauffeur"

**Technologies envisagées** :
- Intégration d'un LLM (Claude, GPT) pour la compréhension du langage naturel
- Recherche vectorielle pour améliorer la pertinence des résultats
- Système de filtres (prix, localisation, catégorie)

#### Consultation du dernier numéro
Ajouter une commande `/dernier` permettant de recevoir immédiatement la dernière parution disponible, même sans abonnement.

### 🔔 Système d'alertes personnalisées (Priorité moyenne)

Permettre aux utilisateurs de définir des critères de recherche et recevoir des notifications automatiques lorsqu'une annonce correspondante est publiée.

**Fonctionnalités** :
- Création d'alertes avec critères multiples (catégorie, mots-clés, fourchette de prix)
- Gestion des alertes : liste, modification, suppression
- Notifications push dès qu'une annonce correspond

**Commandes prévues** :
- `/alerte_creer` : Définir une nouvelle alerte
- `/alerte_liste` : Voir toutes ses alertes actives
- `/alerte_supprimer` : Supprimer une alerte

---

## 🎯 Améliorations UX

### Expérience utilisateur optimisée
- **Limitation des messages** : Imposer une taille maximale pour les messages utilisateurs afin d'éviter les abus et améliorer les performances
- **Accueil amélioré** : Lors du premier `/start`, proposer automatiquement de recevoir le dernier numéro publié pour faciliter la découverte du service

---

## 🛠️ Infrastructure & DevOps

### ✅ Réalisé

- **✅ Versionnage sémantique** : Système complet basé sur les commits conventionnels avec `standard-version`
  - Détection automatique du type de version (MAJOR, MINOR, PATCH)
  - Génération automatique de CHANGELOG.md
  - Scripts npm pour les releases
  - Documentation complète dans CONTRIBUTING.md

- **✅ Déploiement automatique** : Google Cloud Build configuré
  - Déclenchement automatique sur push `main`
  - Fichier `cloudbuild.yaml` pour la configuration
  - Variables d'environnement gérées via `env.yaml`
  - Déploiement sur Cloud Run (région: europe-west1)

### 🚧 À venir

- **Tests automatisés** : Ajouter des tests unitaires et d'intégration
  - Tests avec Jest ou Mocha
  - Exécution avant chaque déploiement
  - Coverage minimum requis

- **Monitoring et alertes** : Surveillance de la production
  - Métriques Cloud Run
  - Alertes sur erreurs
  - Dashboard de monitoring

---

## 🏗️ Refactoring & Architecture

### Modularisation du projet
Restructurer le code en services distincts pour améliorer la maintenabilité et permettre une évolution indépendante de chaque composante.

**Architecture cible** :
```
zoomchat/
├── services/
│   ├── bot-service/          # Gestion des commandes Telegram
│   ├── parser-service/       # Extraction des annonces PDF
│   ├── search-service/       # Moteur de recherche
│   ├── notification-service/ # Gestion des alertes et envois
│   └── database-service/     # Couche d'accès aux données
├── shared/                   # Code partagé (utils, types, config)
└── scripts/                  # Scripts de déploiement et maintenance
```

**Bénéfices attendus** :
- Meilleure séparation des responsabilités
- Tests unitaires simplifiés
- Déploiement indépendant des services
- Scalabilité améliorée

---

## 📊 Métriques et suivi

Pour suivre l'avancement du projet :
- **7 fonctionnalités réalisées** sur 9 planifiées (78%)
- **Infrastructure** : Versionnement et CI/CD ✅
- **Focus actuel** : Extraction et recherche d'annonces
- **Prochaine release** : v2.0.0 avec la recherche en langage naturel

---

*Dernière mise à jour : 26 octobre 2025*
