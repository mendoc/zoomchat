# Configuration de Google Apps Script (Code.gs)

## 📝 Configuration requise

Après le déploiement sur Cloud Run, vous devez mettre à jour les URLs dans `Code.gs`.

### 1. Récupérer l'URL de Cloud Run

Après le déploiement avec `npm run deploy`, récupérez l'URL du service :

```bash
gcloud run services describe zoomchat --region=europe-west1 --format='value(status.url)'
```

Exemple de sortie : `https://zoomchat-abc123-europe-west1.run.app`

### 2. Mettre à jour Code.gs

Ouvrez `Code.gs` et modifiez les lignes suivantes :

#### Ligne 161 : URL de la fonction massNotify
```javascript
// AVANT
const cloudFunctionUrl = "https://europe-west1-YOUR_PROJECT_ID.cloudfunctions.net/massNotify";

// APRÈS (remplacer par votre URL Cloud Run)
const cloudFunctionUrl = "https://zoomchat-abc123-europe-west1.run.app/massNotify";
```

#### Ligne 215 : URL de l'extraction des annonces
```javascript
// AVANT
const cloudRunUrl = "https://zoomchat-YOUR_SERVICE_ID-europe-west1.run.app/extract";

// APRÈS (remplacer par votre URL Cloud Run)
const cloudRunUrl = "https://zoomchat-abc123-europe-west1.run.app/extract";
```

### 3. Workflow automatique complet

Une fois configuré, le workflow automatique sera :

1. **Email reçu** : Zoom Hebdo envoie un email avec le lien de la parution
2. **Extraction URL** : Code.gs extrait l'URL du PDF
3. **Sauvegarde en base** : La parution est enregistrée dans PostgreSQL
4. **Envoi au chat test** : Le PDF est envoyé au chat de test pour récupérer le `file_id`
5. **Envoi en masse** : Appel à `/massNotify` pour envoyer à tous les abonnés
6. **🆕 Extraction des annonces** : Appel automatique à `/extract` pour parser et sauvegarder ~200 annonces
7. **Disponibilité** : Les annonces sont immédiatement disponibles via `/search`

### 4. Logs à vérifier

Dans Google Apps Script, vérifiez que vous voyez :

```
📤 Envoi du PDF au chat de test pour récupérer le file_id...
✅ File ID récupéré: ABC123...
📡 Appel de la Cloud Function pour l'envoi en masse...
✅ Envoi en masse réussi !
📊 Statistiques: 15/15 réussis, 0 échecs
🔍 Déclenchement de l'extraction des annonces...
✅ Extraction réussie !
📊 Parution N°1545 - 24/10/2025 au 30/10/2025
📝 195 annonces extraites, 195 sauvegardées
```

### 5. Test manuel

Pour tester l'extraction manuellement, vous pouvez exécuter directement la fonction :

```javascript
// Dans l'éditeur Apps Script, exécuter :
triggerAnnouncesExtraction();
```

## 🔍 Endpoints disponibles

Une fois déployé, votre service Cloud Run expose :

- `POST /extract` - Extraction automatique des annonces
- `GET /search?q=...` - Recherche d'annonces
- `POST /massNotify` - Envoi en masse (existant)
- `POST /webhook` - Webhook Telegram (existant)

## 🚀 Déploiement

```bash
# 1. Déployer sur Cloud Run
npm run deploy

# 2. Récupérer l'URL
gcloud run services describe zoomchat --region=europe-west1 --format='value(status.url)'

# 3. Mettre à jour Code.gs avec l'URL
# 4. Copier le code dans Google Apps Script
# 5. Tester avec triggerAnnouncesExtraction()
```

## 📊 Vérification

Pour vérifier que tout fonctionne :

1. Déclencher manuellement `checkNewEmails()` dans Apps Script
2. Vérifier les logs pour voir l'extraction
3. Tester la recherche : `curl "https://[URL]/search?q=studio"`
