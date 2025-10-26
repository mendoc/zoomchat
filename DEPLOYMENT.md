# Guide de déploiement sur GCP Cloud Run

## Prérequis

1. **Google Cloud SDK** installé : https://cloud.google.com/sdk/docs/install
2. **Docker** installé : https://docs.docker.com/get-docker/
3. **Compte GCP** avec facturation activée
4. **PostgreSQL** accessible depuis internet (ou Cloud SQL)

---

## Étape 1 : Test local avec Docker (optionnel)

### 1.1 Construire l'image Docker

```bash
docker build -t zoomchat-bot .
```

### 1.2 Tester localement

```bash
docker run -p 8080:8080 \
  -e TELEGRAM_BOT_TOKEN=your_bot_token \
  -e DATABASE_URL=your_postgresql_url \
  -e NODE_ENV=production \
  zoomchat-bot
```

### 1.3 Tester le health check

Ouvrir dans le navigateur : http://localhost:8080/health

Vous devriez voir :
```json
{"status":"ok","service":"ZoomChat Bot"}
```

---

## Étape 2 : Configuration de GCP

### 2.1 Se connecter à GCP

```bash
gcloud auth login
```

### 2.2 Créer ou sélectionner un projet

```bash
# Créer un nouveau projet
gcloud projects create zoomchat-bot --name="ZoomChat Bot"

# Ou lister les projets existants
gcloud projects list

# Définir le projet actif
gcloud config set project zoomchat-bot
```

### 2.3 Activer les APIs nécessaires

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2.4 Configurer la région (optionnel)

```bash
gcloud config set run/region europe-west1
```

---

## Étape 3 : Déploiement sur Cloud Run

### 3.1 Déployer avec gcloud

```bash
gcloud run deploy zoomchat-bot \
  --source . \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars "TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN" \
  --set-env-vars "DATABASE_URL=postgresql://user:password@host:port/database" \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1
```

**Explication des options :**
- `--source .` : Construit automatiquement l'image depuis le Dockerfile
- `--allow-unauthenticated` : Permet à Telegram d'envoyer des requêtes
- `--min-instances 0` : Scale à 0 pour économiser (gratuit si pas d'utilisation)
- `--max-instances 10` : Maximum 10 instances simultanées
- `--memory 512Mi` : 512 MB de RAM par instance
- `--cpu 1` : 1 vCPU par instance

### 3.2 Récupérer l'URL du service

Après le déploiement, vous obtiendrez une URL du type :
```
https://zoomchat-bot-xxxxx-ew.a.run.app
```

**Notez cette URL !** Vous en aurez besoin pour configurer le webhook.

---

## Étape 4 : Configuration du webhook Telegram

### 4.1 Mettre à jour la variable WEBHOOK_URL

```bash
gcloud run services update zoomchat-bot \
  --region europe-west1 \
  --set-env-vars "WEBHOOK_URL=https://zoomchat-bot-xxxxx-ew.a.run.app/webhook"
```

### 4.2 Configurer le webhook Telegram

Ouvrir dans le navigateur :
```
https://zoomchat-bot-xxxxx-ew.a.run.app/setWebhook
```

Vous devriez voir :
```json
{"success":true,"message":"Webhook configuré","url":"https://..."}
```

---

## Étape 5 : Vérifier le déploiement

### 5.1 Tester le bot sur Telegram

Ouvrir Telegram et envoyer `/start` à votre bot.

### 5.2 Consulter les logs

```bash
gcloud run services logs read zoomchat-bot \
  --region europe-west1 \
  --limit 50
```

### 5.3 Surveiller les métriques

```bash
# Ouvrir la console Cloud Run
gcloud run services describe zoomchat-bot \
  --region europe-west1 \
  --platform managed
```

Ou dans le navigateur :
https://console.cloud.google.com/run

---

## Étape 6 : Mise à jour du code Google Apps Script

### 6.1 Mettre à jour l'URL dans Code.gs

Modifier la ligne de l'URL de la Cloud Function vers Cloud Run :

```javascript
// Ancien (Cloud Functions)
const cloudFunctionUrl = 'https://europe-west1-xxx.cloudfunctions.net/massNotify';

// Nouveau (Cloud Run)
const cloudRunUrl = 'https://zoomchat-bot-xxxxx-ew.a.run.app/massNotify';
```

---

## Commandes utiles

### Redéployer après modifications

```bash
gcloud run deploy zoomchat-bot \
  --source . \
  --region europe-west1
```

### Mettre à jour les variables d'environnement

```bash
gcloud run services update zoomchat-bot \
  --region europe-west1 \
  --set-env-vars "NEW_VAR=value"
```

### Voir les variables d'environnement actuelles

```bash
gcloud run services describe zoomchat-bot \
  --region europe-west1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### Supprimer le service

```bash
gcloud run services delete zoomchat-bot \
  --region europe-west1
```

---

## Coûts estimés

Cloud Run est **gratuit** jusqu'à :
- 2 millions de requêtes/mois
- 360 000 GB-secondes de mémoire
- 180 000 vCPU-secondes

**Pour ZoomChat :**
- Avec `--min-instances 0` : ~0-5€/mois (dépend du trafic)
- Avec `--min-instances 1` : ~20-30€/mois (instance toujours active)

---

## Dépannage

### Le bot ne répond pas

1. Vérifier les logs : `gcloud run services logs read zoomchat-bot`
2. Vérifier que le webhook est configuré : `/setWebhook`
3. Vérifier les variables d'environnement

### Erreur "Service Unavailable"

- Augmenter la mémoire : `--memory 1Gi`
- Augmenter le timeout : `--timeout 300`

### Erreur de connexion PostgreSQL

- Vérifier que PostgreSQL autorise les connexions externes
- Utiliser Cloud SQL avec connexion privée (recommandé)

---

## Sécurité

### Utiliser Secret Manager (recommandé)

Au lieu de passer les secrets en variables d'environnement :

```bash
# Créer un secret
echo -n "your_bot_token" | gcloud secrets create telegram-bot-token --data-file=-

# Donner accès à Cloud Run
gcloud run deploy zoomchat-bot \
  --set-secrets "TELEGRAM_BOT_TOKEN=telegram-bot-token:latest"
```
