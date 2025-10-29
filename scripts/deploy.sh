#!/bin/bash

# Script de déploiement pour ZoomChat sur GCP Cloud Run
# Build l'image Docker localement et la déploie sans utiliser Cloud Build
# Usage: npm run deploy

set -e  # Exit on error

echo "🚀 Déploiement de ZoomChat sur GCP Cloud Run (build local)..."
echo ""

# Vérifier que .env.prod existe
if [ ! -f .env.prod ]; then
    echo "❌ Erreur: Le fichier .env.prod n'existe pas"
    echo "   Créez-le à partir de .env.prod.example"
    exit 1
fi

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas installé ou n'est pas accessible"
    echo "   Installez Docker Desktop: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

# Vérifier que Docker est démarré
if ! docker info &> /dev/null; then
    echo "❌ Erreur: Docker n'est pas démarré"
    echo "   Démarrez Docker Desktop et réessayez"
    exit 1
fi

# Configuration
PROJECT_ID="zoomchat-476308"
SERVICE_NAME="zoomchat-bot"
IMAGE_NAME="zoomchat"
REGION="europe-west1"
REGISTRY="gcr.io"

# Récupérer la version depuis package.json
VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
VERSION_TAG=$(echo "$VERSION" | tr '.' '-')

# Nom complet de l'image
IMAGE_FULL="$REGISTRY/$PROJECT_ID/$IMAGE_NAME:$VERSION"
IMAGE_LATEST="$REGISTRY/$PROJECT_ID/$IMAGE_NAME:latest"

echo "📦 Configuration:"
echo "   Projet GCP: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Région: $REGION"
echo "   Image: $IMAGE_FULL"
echo "   Version: $VERSION"
echo ""

# Configurer l'authentification Docker pour GCR (si nécessaire)
echo "🔑 Vérification de l'authentification Docker avec GCR..."
if ! gcloud auth print-access-token | docker login -u oauth2accesstoken --password-stdin https://$REGISTRY &> /dev/null; then
    echo "⚠️  Configuration de l'authentification Docker pour GCR..."
    gcloud auth configure-docker $REGISTRY --quiet
fi
echo "✅ Authentification OK"
echo ""

# Builder l'image Docker localement
echo "🔨 Build de l'image Docker localement..."
docker build -t $IMAGE_FULL -t $IMAGE_LATEST --platform linux/amd64 .

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build de l'image Docker"
    exit 1
fi

echo "✅ Image buildée avec succès"
echo ""

# Pousser l'image vers GCR
echo "📤 Push de l'image vers Google Container Registry..."
docker push $IMAGE_FULL
docker push $IMAGE_LATEST

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du push de l'image vers GCR"
    exit 1
fi

echo "✅ Image poussée avec succès"
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
echo "☁️  Déploiement sur Cloud Run avec révision v$VERSION_TAG..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_FULL \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS" \
  --project $PROJECT_ID \
  --revision-suffix "v$VERSION_TAG" \
  --min-instances 0 \
  --max-instances 5 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 1200

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
echo "💰 Économies: Aucun coût Cloud Build (build local uniquement)"
echo ""
echo "📋 Commandes utiles:"
echo "   Voir les logs:        gcloud run services logs tail $SERVICE_NAME --region $REGION --project $PROJECT_ID"
echo "   Ouvrir la console:    https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME/metrics?project=$PROJECT_ID"
echo "   Liste des images GCR: gcloud container images list --repository=$REGISTRY/$PROJECT_ID"
