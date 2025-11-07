# Historique des versions
### [10.1.9](https://github.com/mendoc/zoomchat/compare/v10.1.8...v10.1.9) (2025-11-07)

### [10.1.8](https://github.com/mendoc/zoomchat/compare/v10.1.7...v10.1.8) (2025-11-07)


### 🐛 Corrections de bugs

* **extraction**: amélioration de la détection d'erreurs lors de l'extraction
  - Distinction entre "extraction déjà faite" (succès) et "échec d'extraction" (erreur)
  - Pas de notification d'erreur admin si l'extraction a déjà été effectuée
  - Notification admin uniquement si une action a été effectuée (extraction ou embeddings)
  - L'envoi massif est toujours déclenché en cas de succès

### [10.1.7](https://github.com/mendoc/zoomchat/compare/v10.1.6...v10.1.7) (2025-11-07)


### 🐛 Corrections de bugs

* **cloudbuild**: échappement des variables bash avec $$ dans cloudbuild.yaml
  - Cloud Build interprétait $VERSION comme substitution au lieu de variable bash
  - Utilisation de bash entrypoint pour l'étape de build Docker

### [10.1.6](https://github.com/mendoc/zoomchat/compare/v10.1.5...v10.1.6) (2025-11-07)

### [10.1.5](https://github.com/mendoc/zoomchat/compare/v10.1.4...v10.1.5) (2025-11-07)


### ✨ Nouvelles fonctionnalités

* **déploiement automatique**: ajout du workflow Cloud Build avec versioning automatique
  - Fichier `cloudbuild.yaml` pour déploiement automatique sur push GitHub
  - Suffixe de révision Cloud Run basé sur le numéro de version (ex: `v10-1-8`)
  - Traçabilité complète : chaque révision correspond à une version Git
  - Documentation complète des deux modes de déploiement (automatique vs manuel)

### [10.1.4](https://github.com/mendoc/zoomchat/compare/v10.1.3...v10.1.4) (2025-11-07)


### ✨ Nouvelles fonctionnalités

* **extraction non-bloquante**: POST /extract répond immédiatement avec 202 Accepted
  - Google Apps Script n'est plus bloqué pendant l'extraction
  - L'extraction s'exécute en arrière-plan avec promise chain
  - L'envoi massif est automatiquement déclenché après extraction réussie
  - Notifications admin envoyées en arrière-plan
  - Erreurs d'extraction gérées sans bloquer l'appelant

* **déploiement automatique**: ajout du workflow Cloud Build avec versioning automatique
  - Fichier `cloudbuild.yaml` pour déploiement automatique sur push GitHub
  - Suffixe de révision Cloud Run basé sur le numéro de version (ex: `v10-1-4`)
  - Traçabilité complète : chaque révision correspond à une version Git
  - Documentation complète des deux modes de déploiement (automatique vs manuel)

### [10.1.3](https://github.com/mendoc/zoomchat/compare/v10.1.2...v10.1.3) (2025-11-07)


### ✨ Nouvelles fonctionnalités

* **extraction non-bloquante**: POST /extract répond immédiatement avec 202 Accepted
  - Google Apps Script n'est plus bloqué pendant l'extraction
  - L'extraction s'exécute en arrière-plan avec promise chain
  - L'envoi massif est automatiquement déclenché après extraction réussie
  - Notifications admin envoyées en arrière-plan
  - Erreurs d'extraction gérées sans bloquer l'appelant

## [10.1.2](https://github.com/mendoc/zoomchat/compare/v10.0.6...v10.1.2) (2025-11-07)


### ✨ Nouvelles fonctionnalités

* **workflow extraction**: refonte complète du workflow d'extraction avec indexation préalable ([c97bb00](https://github.com/mendoc/zoomchat/commit/c97bb00))
  - Nouveau workflow en 3 étapes : POST /parution → POST /extract → POST /notify
  - Garantit que les annonces sont extraites et indexées AVANT l'envoi du PDF aux abonnés
  - Permet aux utilisateurs de rechercher immédiatement dans la parution dès réception
  - Google Apps Script déclenche le processus en fire-and-forget
  - Nouvelles routes serveur :
    * POST /parution : enregistrement des parutions avec date de réception email
    * POST /notify : envoi massif avec upload automatique à Telegram
  - Routes modifiées :
    * POST /extract : accepte numero, appelle /notify en cas de succès
  - Notifications admin enrichies :
    * Échec d'extraction (complet/partiel) avec statistiques
    * Succès/échec d'envoi massif avec taux de réussite
  - Script Apps Script mis à jour pour le nouveau workflow

* **renommage PDF**: ajout du renommage automatique du PDF lors de l'envoi ([283b1f4](https://github.com/mendoc/zoomchat/commit/283b1f4))
  - Format : ZOOM-HEBDO-{numero}-{id}.pdf
  - Extrait l'ID depuis l'URL du PDF (ex: ?id=600)
  - Appliqué pour l'admin et tous les abonnés

* **migration base de données**: permettre telegram_file_id NULL ([4ffc0fd](https://github.com/mendoc/zoomchat/commit/4ffc0fd))
  - Migration SQL pour permettre NULL sur telegram_file_id
  - Nécessaire pour le nouveau workflow (file_id ajouté plus tard)
  - Script de migration automatique créé

* ajout d'un message introductif lors de l'envoi en masse du PDF ([f36e3f0](https://github.com/mendoc/zoomchat/commit/f36e3f0))


### 🐛 Corrections de bugs

* remplacement de BadRequestError par ValidationError ([0123168](https://github.com/mendoc/zoomchat/commit/0123168))
  - Correction d'erreur d'import dans les routes
  - BadRequestError n'existait pas dans shared/errors.js

### [10.0.7](https://github.com/mendoc/zoomchat/compare/v10.0.6...v10.0.7) (2025-11-07)

### [10.0.6](https://github.com/mendoc/zoomchat/compare/v10.0.5...v10.0.6) (2025-11-04)

### [10.0.5](https://github.com/mendoc/zoomchat/compare/v10.0.4...v10.0.5) (2025-11-04)

### [10.0.4](https://github.com/mendoc/zoomchat/compare/v10.0.3...v10.0.4) (2025-11-02)

### [10.0.5](https://github.com/mendoc/zoomchat/compare/v10.0.3...v10.0.5) (2025-11-02)

### ✨ Nouvelles fonctionnalités

* **tracking parutions**: ajout du tracking des parutions dans les résultats de recherche
  - Nouvelle colonne `parution_id` (integer avec FK vers parutions) dans `bot_responses` pour lier chaque réponse à sa parution source
  - Suppression de `search_results_count` (redondante)
  - Enrichissement de `VectorSearchService.formatResults()` pour inclure le `parution_id` de chaque annonce
  - Capture automatique du `parution_id` dans `TextHandler` et stockage dans `ctx.state.currentParutionId` pour chaque réponse individuelle
  - Logging automatique du `parution_id` dans `ConversationLogger` lors de l'enregistrement des réponses
  - Nouvelles méthodes d'analyse dans `ConversationRepository` :
    * `getMostSearchedParutions(limit)` - Top N parutions les plus recherchées par fréquence d'apparition
    * `getParutionSearchStats(parutionId)` - Statistiques détaillées pour une parution (apparitions, utilisateurs uniques, dates)
  - Modèle de données simplifié : une bot_response = une annonce = une parution (relation 1:1)
  - Permet d'analyser quelles parutions génèrent le plus d'interactions et d'identifier les contenus populaires

### [10.0.3](https://github.com/mendoc/zoomchat/compare/v10.0.2...v10.0.3) (2025-11-02)

## [10.1.0](https://github.com/mendoc/zoomchat/compare/v10.0.2...v10.1.0) (2025-11-02)

### ✨ Nouvelles fonctionnalités

* **historique conversations**: ajout d'un système complet de tracking des interactions utilisateur avec le bot
  - Nouvelle table `conversations` pour enregistrer toutes les interactions utilisateur (commandes, recherches, callbacks)
  - Nouvelle table `bot_responses` pour enregistrer toutes les réponses du bot
  - `SessionManager` pour regrouper les interactions par sessions (timeout 30 minutes)
  - `ConversationRepository` avec méthodes d'analyse et statistiques
  - Middleware automatique `ConversationLogger` qui capture 100% des interactions sans modifier les handlers existants
  - Permet d'analyser les habitudes utilisateurs, requêtes populaires, et améliorer le bot

### [10.0.2](https://github.com/mendoc/zoomchat/compare/v10.0.1...v10.0.2) (2025-11-02)

### [10.0.1](https://github.com/mendoc/zoomchat/compare/v10.0.0...v10.0.1) (2025-11-02)

## 11.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### 📚 Documentation

* mise à jour de la documentation pour le hook git natif ([362834b](https://github.com/mendoc/zoomchat/commit/362834bdb8ad8c6dbafe293ef97f723e0cb4fb33))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* automatisation du setup ngrok pour le développement ([75ee774](https://github.com/mendoc/zoomchat/commit/75ee774ea12f122d1830779321bd9386d1c2b207))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))


### 🐛 Corrections de bugs

* correction bugs serveur et amélioration notifications extraction ([59f4408](https://github.com/mendoc/zoomchat/commit/59f4408ccdb3034f72b940e0def9a76406612dc4))
* correction dépendance circulaire adminNotifier dans les commandes bot ([d959581](https://github.com/mendoc/zoomchat/commit/d9595811a2adbd2df43c7636617b68fde6e76efa))
* correction du parsing Markdown et mapping des stats pour les notifications admin ([52e2a60](https://github.com/mendoc/zoomchat/commit/52e2a6007740d990b7a1b2254c40acca68fe63ac))
* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))

## 10.0.1 (2025-11-02)

### 🐛 Corrections de bugs

* correction dépendance circulaire adminNotifier dans les commandes bot

## 10.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### 📚 Documentation

* mise à jour de la documentation pour le hook git natif ([362834b](https://github.com/mendoc/zoomchat/commit/362834bdb8ad8c6dbafe293ef97f723e0cb4fb33))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* automatisation du setup ngrok pour le développement ([75ee774](https://github.com/mendoc/zoomchat/commit/75ee774ea12f122d1830779321bd9386d1c2b207))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))


### 🐛 Corrections de bugs

* correction bugs serveur et amélioration notifications extraction ([59f4408](https://github.com/mendoc/zoomchat/commit/59f4408ccdb3034f72b940e0def9a76406612dc4))
* correction du parsing Markdown et mapping des stats pour les notifications admin ([52e2a60](https://github.com/mendoc/zoomchat/commit/52e2a6007740d990b7a1b2254c40acca68fe63ac))
* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))

## 10.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### 📚 Documentation

* mise à jour de la documentation pour le hook git natif ([362834b](https://github.com/mendoc/zoomchat/commit/362834bdb8ad8c6dbafe293ef97f723e0cb4fb33))


### 🐛 Corrections de bugs

* correction du parsing Markdown et mapping des stats pour les notifications admin ([52e2a60](https://github.com/mendoc/zoomchat/commit/52e2a6007740d990b7a1b2254c40acca68fe63ac))
* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* automatisation du setup ngrok pour le développement ([75ee774](https://github.com/mendoc/zoomchat/commit/75ee774ea12f122d1830779321bd9386d1c2b207))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))

## 9.1.0 (2025-11-02)

### 🐛 Corrections de bugs

* correction du crash serveur quand WEBHOOK_URL n'est pas défini (server.js:143)
* correction de la conversion USE_WEBHOOK avec Zod (env.js) - "false" était converti en true

### ✨ Améliorations

* amélioration des notifications admin d'extraction avec stats détaillées
  - Affichage des annonces extraites, sauvegardées et ignorées
  - Ajout d'une section dédiée aux embeddings
  - Messages plus clairs et informatifs

## 9.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))


### 📚 Documentation

* mise à jour de la documentation pour le hook git natif ([362834b](https://github.com/mendoc/zoomchat/commit/362834bdb8ad8c6dbafe293ef97f723e0cb4fb33))


### 🐛 Corrections de bugs

* correction du parsing Markdown et mapping des stats pour les notifications admin ([52e2a60](https://github.com/mendoc/zoomchat/commit/52e2a6007740d990b7a1b2254c40acca68fe63ac))
* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))

## 8.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### 🐛 Corrections de bugs

* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))


### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))


### 📚 Documentation

* mise à jour de la documentation pour le hook git natif ([362834b](https://github.com/mendoc/zoomchat/commit/362834bdb8ad8c6dbafe293ef97f723e0cb4fb33))

## 7.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### 🐛 Corrections de bugs

* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))


### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du hook git natif pour versioning automatique ([b388900](https://github.com/mendoc/zoomchat/commit/b388900544707c9040d8c087226011fd9f65dbd7))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))

## 6.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### 🐛 Corrections de bugs

* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))


### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))
* suppression de Husky et Pino, ajout d'un script de versioning simplifié ([f744f45](https://github.com/mendoc/zoomchat/commit/f744f45d498bc2e15dc45fcd11aed19ee81122d0))

## 5.0.0 (2025-11-02)


### ⚠ BREAKING CHANGES

* migration vers recherche vectorielle pure
* restructuration complète de l'architecture

### ♻️ Refactoring

* migration vers recherche vectorielle pure ([6138537](https://github.com/mendoc/zoomchat/commit/6138537e603285e4a7bcc300dd3f72a4a8300f48))
* restructuration complète de l'architecture ([9d1fa6a](https://github.com/mendoc/zoomchat/commit/9d1fa6acb7ce41e148cdb48208c653c14520bdc3))


### 🐛 Corrections de bugs

* corrige l'ordre des appels dans checkNewEmails et améliore les logs d'envoi de PDF ([11be1a4](https://github.com/mendoc/zoomchat/commit/11be1a44b6c196b30ea236e934e63bc3508e57c2))
* Réponds avec un statut 200 à Telegram pour éviter les erreurs de timeout ([3b1ad20](https://github.com/mendoc/zoomchat/commit/3b1ad204d24a6defbed44d471543f4213b46c4e6))


### ✨ Nouvelles fonctionnalités

* ajout de l'extraction et recherche d'annonces ([427a957](https://github.com/mendoc/zoomchat/commit/427a957ef93f7a44c8ccb92c63eaba02aaf01e9d))
* ajout de la commande /dernier et refonte de la table annonces ([752bd6e](https://github.com/mendoc/zoomchat/commit/752bd6eb59aed4091741243d1ffd522c73beecf8))
* ajout de la recherche sémantique avec embeddings Gemini ([d2e085b](https://github.com/mendoc/zoomchat/commit/d2e085bc732aacace2763a2301f179752d6e6eb9))
* ajout de la version dans le nom de révision Cloud Run ([0d1bc7f](https://github.com/mendoc/zoomchat/commit/0d1bc7fd9f518f5ea09e41ac64aa40d16866a563))
* ajout de notifications admin pour l'extraction des annonces ([b804669](https://github.com/mendoc/zoomchat/commit/b804669b9cc314a78cd7bab8a0952aed614847de))
* ajout du filtre de pertinence LLM pour la recherche ([3c45bb3](https://github.com/mendoc/zoomchat/commit/3c45bb3cb5098561752be1ced059669445222cd1))
* ajout du script de déploiement manuel npm run deploy ([48c9fb2](https://github.com/mendoc/zoomchat/commit/48c9fb23a5cbb47c4898fa74d1b9c965d67b06d3))
* ajout du versionnage automatique via Husky ([d523122](https://github.com/mendoc/zoomchat/commit/d5231225125ab885b8fde560376d8605e1464e7d))
* Ajoute des fonctionnalités d'extraction et de mise à jour des annonces, améliore la gestion des conflits et la journalisation ([cd83b67](https://github.com/mendoc/zoomchat/commit/cd83b67dd189a0a63cef081960963d5b63fa9e23))
* amélioration du gestionnaire de texte pour une réponse immédiate et recherche en arrière-plan ([8b8f833](https://github.com/mendoc/zoomchat/commit/8b8f8331006d5ade2d4a2dccd7a4a7b8265cb3c5))
* build Docker local et correction du hook pre-commit ([587817e](https://github.com/mendoc/zoomchat/commit/587817e8eec13c8e1dc7c884871e23c49d6a4b42))
* configuration du déploiement automatique via Google Cloud Build ([e584572](https://github.com/mendoc/zoomchat/commit/e5845722bd4a91499428c61cd0af00f035dc902c))
* correction de la récupération du numéro de parution dans la route d'extraction ([571a7cf](https://github.com/mendoc/zoomchat/commit/571a7cf2c13d6a4a2958d44c5d23ebd1b179c4c1))
* Crée un utilisateur inactif à la première interaction ([a8f2850](https://github.com/mendoc/zoomchat/commit/a8f285038b9352c575b2531d02e105b750dc6025))
* enregistre l'utilisqteur lors de sa première interaction avec le bot ([dd9990b](https://github.com/mendoc/zoomchat/commit/dd9990bfcf5a7852b17343a624d8a78294c143c9))
* implémentation du système de versionnement automatique ([7b0bdfa](https://github.com/mendoc/zoomchat/commit/7b0bdfac03045d3818aa2cbfc645758c0f9d60f5))
* migration vers Gemini et optimisation extraction avec pool de workers ([ea0ff5a](https://github.com/mendoc/zoomchat/commit/ea0ff5a4dbddf6ec7eba35d5e53794ac2647ba0b))
