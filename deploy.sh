!/bin/bash

# Script de déploiement pour ZoomChat sur GCP Cloud Run
# Usage: npm run deploy

set -e  # Exit on error

echo "🚀 Déploiement de ZoomChat sur GCP Cloud Run..."
echo ""

# Vérifier que .env.prod existe
if [ ! -f .env.prod ]; then
    echo "❌ Erreur: Le fichier .env.prod n'existe pas"
    echo "   Créez-le à partir de .env.prod.example"
    exit 1
fi

# Configuration
PROJECT_ID="zoomchat-476308"
SERVICE_NAME="zoomchat-bot"
REGION="europe-west1"

# Récupérer la version depuis package.json
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/' | tr '.' '-')

echo "📦 Configuration:"
echo "   Projet GCP: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Région: $REGION"
echo "   Version: $VERSION"
echo ""

# Charger les variables d'environnement depuis .env.prod
echo "🔧 Chargement des variables d'environnement depuis .env.prod..."

# Convertir .env.prod en format pour gcloud (KEY=VALUE)
ENV_VARS=$(grep -v '^#' .env.prod | grep -v '^$' | tr '\n' ',' | sed 's/,$//')

if [ -z "$ENV_VARS" ]; then
    echo "❌ Erreur: Aucune variable d'environnement trouvée dans .env.prod"
    exit 1
fi

echo "✅ Variables chargées"
echo ""

# Déployer sur Cloud Run
echo "☁️  Déploiement sur Cloud Run avec révision v$VERSION..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS" \
  --project $PROJECT_ID \
  --revision-suffix "v$VERSION" \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300

echo ""
echo "✅ Déploiement terminé avec succès!"
echo ""

# Récupérer l'URL du service
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(status.url)')

echo "🌐 URL du service: $SERVICE_URL"
echo ""

# Proposer de configurer le webhook
read -p "Voulez-vous configurer le webhook Telegram maintenant? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔗 Configuration du webhook..."
    curl -s "${SERVICE_URL}/setWebhook" | jq '.'
    echo ""
fi

echo "🎉 Déploiement terminé!"
echo ""
echo "📋 Commandes utiles:"
echo "   Voir les logs:    gcloud run services logs tail $SERVICE_NAME --region $REGION --project $PROJECT_ID"
echo "   Ouvrir la console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
