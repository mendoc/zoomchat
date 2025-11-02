# Historique des versions
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
