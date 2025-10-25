# ZoomChat

Un assistant virtuel Telegram pour trouver des petites annonces dans le Zoom Hebdo.

## 📋 Composants du système

Le système ZoomChat comprend deux composants complémentaires :

1. **Bot Telegram interactif** (Node.js + GCP Cloud Functions)
   - Répond aux commandes des utilisateurs (`/start`, `/aide`)
   - Permet de rechercher des annonces (fonctionnalité à venir)

2. **Système de notification automatique** (Google Apps Script)
   - Surveille les emails de Zoom Hebdo
   - Envoie automatiquement les nouvelles parutions en PDF aux abonnés sur Telegram

## 🚀 Prérequis

### Pour le Bot Telegram
- Node.js >= 18.0.0
- Un compte Telegram et un bot créé via [@BotFather](https://t.me/botfather)
- Un compte Google Cloud Platform (GCP)
- Google Cloud CLI (`gcloud`) installé

### Pour le système de notification automatique
- Un compte Google (Gmail)
- Accès à Google Apps Script
- Un compte sur [cron-job.org](https://cron-job.org) (gratuit)
- Abonnement aux emails de Zoom Hebdo

## 📦 Installation

1. Cloner le projet :
```bash
git clone https://github.com/mendoc/zoomchat.git
cd zoomchat
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
   - Créer un bot Telegram via [@BotFather](https://t.me/botfather)
   - Copier le token du bot
   - Éditer le fichier `.env` et remplacer `your_bot_token_here` par votre token

## 🧪 Développement local

Pour tester le bot localement (mode polling) :

```bash
npm run dev
```

Le bot sera accessible sur Telegram. Testez avec `/start` pour voir le message de bienvenue.

## 🌐 Déploiement sur GCP Cloud Functions

### 1. Configuration initiale de GCP

```bash
# Se connecter à GCP
gcloud auth login

# Créer un nouveau projet (optionnel)
gcloud projects create zoomchat-bot --name="ZoomChat Bot"

# Définir le projet actif
gcloud config set project zoomchat-bot

# Activer l'API Cloud Functions
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 2. Déployer la fonction

```bash
gcloud functions deploy telegramWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point telegramWebhook \
  --region europe-west1 \
  --set-env-vars TELEGRAM_BOT_TOKEN=your_bot_token_here
```

### 3. Configurer le webhook

Après le déploiement, vous recevrez une URL du type :
```
https://europe-west1-zoomchat-bot.cloudfunctions.net/telegramWebhook
```

Déployer la fonction de configuration du webhook :

```bash
gcloud functions deploy setWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point setWebhook \
  --region europe-west1 \
  --set-env-vars TELEGRAM_BOT_TOKEN=your_bot_token_here,WEBHOOK_URL=https://europe-west1-zoomchat-bot.cloudfunctions.net/telegramWebhook
```

Puis appeler l'URL de setWebhook dans votre navigateur :
```
https://europe-west1-zoomchat-bot.cloudfunctions.net/setWebhook
```

### Description des fichiers

**Bot Telegram (Node.js):**
- `src/bot.js` : Logique du bot, handlers de commandes (`/start`, `/aide`)
- `src/index.js` : Point d'entrée, gestion webhook/polling

**Notification automatique:**
- `Code.gs` : Script Google Apps Script qui surveille Gmail et envoie les PDF sur Telegram
