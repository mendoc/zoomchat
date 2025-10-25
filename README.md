# ZoomChat

Un assistant virtuel Telegram pour trouver des petites annonces dans le Zoom Hebdo.

## 📋 Composants du système

Le système ZoomChat comprend deux composants complémentaires :

1. **Bot Telegram interactif** (Node.js + GCP Cloud Functions + PostgreSQL)
   - Répond aux commandes des utilisateurs (`/start`, `/aide`)
   - Gestion des abonnements (`/abonner`, `/desabonner`)
   - Base de données PostgreSQL pour stocker les abonnés
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
- Une base de données PostgreSQL (locale ou cloud)

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

3. Créer un fichier `.env` à la racine du projet :
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/zoomchat
```

4. Initialiser la base de données PostgreSQL :
```bash
# Créer la base de données
createdb zoomchat

# Exécuter le schéma
psql -d zoomchat -f schema.sql
```

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
  --set-env-vars TELEGRAM_BOT_TOKEN=your_bot_token_here,DATABASE_URL=your_postgresql_connection_string
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
  --set-env-vars TELEGRAM_BOT_TOKEN=your_bot_token_here,WEBHOOK_URL=https://europe-west1-zoomchat-bot.cloudfunctions.net/telegramWebhook,DATABASE_URL=your_postgresql_connection_string
```

Puis appeler l'URL de setWebhook dans votre navigateur :
```
https://europe-west1-zoomchat-bot.cloudfunctions.net/setWebhook
```

## 📁 Structure du projet

**Bot Telegram (Node.js):**
- `src/bot.js` : Logique du bot, handlers de commandes (`/start`, `/aide`, `/abonner`, `/desabonner`)
- `src/index.js` : Point d'entrée, gestion webhook/polling, initialisation de la base de données
- `src/database.js` : Fonctions de gestion de la base de données PostgreSQL
- `schema.sql` : Schéma de la base de données (table subscribers)

**Notification automatique:**
- `Code.gs` : Script Google Apps Script qui surveille Gmail et envoie les PDF sur Telegram

## 🔑 Commandes disponibles

Une fois le bot démarré, les utilisateurs peuvent utiliser les commandes suivantes :

- `/start` - Afficher le message de bienvenue et les instructions
- `/aide` - Obtenir de l'aide et voir des exemples de recherche
- `/abonner` - S'abonner aux notifications automatiques des nouvelles parutions
- `/desabonner` - Se désabonner des notifications

## 💾 Base de données

Le bot utilise PostgreSQL pour stocker les informations des abonnés :

- **Table `subscribers`** :
  - `id` : Identifiant unique auto-incrémenté
  - `chat_id` : ID du chat Telegram (unique)
  - `nom` : Nom de l'utilisateur (récupéré depuis Telegram)
  - `telephone` : Numéro de téléphone (optionnel)
  - `date_abonnement` : Date et heure de l'abonnement
  - `actif` : Statut de l'abonnement (true/false)

Les abonnés sont désactivés (soft delete) plutôt que supprimés, permettant de conserver l'historique.
