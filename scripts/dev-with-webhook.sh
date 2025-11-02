#!/bin/bash

# Script de développement avec ngrok et configuration automatique du webhook
# Usage: npm run dev

set -e

# Couleurs pour les logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
NGROK_API="http://127.0.0.1:4040/api/tunnels"
PORT=8080
NGROK_PID=""
NGROK_STARTED_BY_SCRIPT=false

# Fonction pour logger
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Fonction de nettoyage au Ctrl+C
cleanup() {
    echo ""
    log_info "Arrêt du serveur..."

    if [ "$NGROK_STARTED_BY_SCRIPT" = true ] && [ ! -z "$NGROK_PID" ]; then
        log_info "Arrêt de ngrok (PID: $NGROK_PID)..."
        kill $NGROK_PID 2>/dev/null || true
        log_success "Ngrok arrêté"
    fi

    exit 0
}

# Trap pour capturer Ctrl+C
trap cleanup SIGINT SIGTERM

# Vérifier si ngrok est installé
check_ngrok_installed() {
    if ! command -v ngrok &> /dev/null; then
        log_error "ngrok n'est pas installé !"
        log_info "Téléchargez ngrok depuis: https://ngrok.com/download"
        exit 1
    fi
}

# Vérifier si ngrok tourne déjà sur le port 8080
check_ngrok_running() {
    log_info "Vérification si ngrok tourne déjà..."

    # Essayer de contacter l'API ngrok
    if curl -s "$NGROK_API" > /dev/null 2>&1; then
        # Vérifier si un tunnel existe pour le port 8080
        local tunnels=$(curl -s "$NGROK_API" | grep -o '"addr":"http://localhost:8080"' || true)
        if [ ! -z "$tunnels" ]; then
            log_success "Ngrok détecté (déjà en cours d'exécution)"
            return 0
        fi
    fi

    return 1
}

# Récupérer l'URL publique de ngrok
get_ngrok_url() {
    log_info "Récupération de l'URL ngrok..."

    local max_attempts=30
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        # Essayer de récupérer l'URL via l'API ngrok
        local url=$(curl -s "$NGROK_API" 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -n1 | cut -d'"' -f4)

        if [ ! -z "$url" ]; then
            echo "$url"
            return 0
        fi

        attempt=$((attempt + 1))
        sleep 1
    done

    log_error "Impossible de récupérer l'URL ngrok après $max_attempts tentatives"
    return 1
}

# Lancer ngrok
start_ngrok() {
    log_info "Lancement de ngrok sur le port $PORT..."

    # Lancer ngrok en arrière-plan
    ngrok http $PORT > /dev/null 2>&1 &
    NGROK_PID=$!
    NGROK_STARTED_BY_SCRIPT=true

    log_success "Ngrok lancé (PID: $NGROK_PID)"

    # Attendre que ngrok soit prêt
    sleep 3
}

# Configurer le webhook Telegram
setup_telegram_webhook() {
    local webhook_url="$1"

    log_info "Configuration du webhook Telegram..."

    # Charger le token depuis .env
    if [ ! -f .env ]; then
        log_error "Fichier .env introuvable !"
        return 1
    fi

    local bot_token=$(grep "^TELEGRAM_BOT_TOKEN=" .env | cut -d'=' -f2)

    if [ -z "$bot_token" ]; then
        log_error "TELEGRAM_BOT_TOKEN non trouvé dans .env !"
        return 1
    fi

    # Appeler l'API Telegram setWebhook
    local full_webhook_url="${webhook_url}/webhook"
    local response=$(curl -s -X POST "https://api.telegram.org/bot${bot_token}/setWebhook" \
        -d "url=${full_webhook_url}" \
        -d "drop_pending_updates=true")

    # Vérifier si la requête a réussi
    local success=$(echo "$response" | grep -o '"ok":true' || true)

    if [ ! -z "$success" ]; then
        log_success "Webhook Telegram configuré: $full_webhook_url"
        return 0
    else
        log_error "Échec de la configuration du webhook Telegram"
        log_error "Réponse: $response"
        return 1
    fi
}

# Script principal
main() {
    echo ""
    log_info "=== Démarrage du serveur en mode webhook avec ngrok ==="
    echo ""

    # Vérifier que ngrok est installé
    check_ngrok_installed

    # Vérifier si ngrok tourne déjà
    if check_ngrok_running; then
        log_info "Utilisation de l'instance ngrok existante"
    else
        log_info "Aucune instance ngrok détectée"
        start_ngrok
    fi

    # Récupérer l'URL ngrok
    local ngrok_url=$(get_ngrok_url)

    if [ -z "$ngrok_url" ]; then
        log_error "Impossible de récupérer l'URL ngrok"
        cleanup
        exit 1
    fi

    log_success "URL ngrok: $ngrok_url"

    # Configurer le webhook Telegram
    if ! setup_telegram_webhook "$ngrok_url"; then
        log_warning "Le webhook Telegram n'a pas pu être configuré automatiquement"
        log_info "Vous pouvez le configurer manuellement en visitant: http://localhost:$PORT/setWebhook"
    fi

    echo ""
    log_info "=== Configuration terminée ==="
    log_info "URL publique: $ngrok_url"
    log_info "Webhook: ${ngrok_url}/webhook"
    log_info "Démarrage du serveur..."
    echo ""

    # Exporter les variables d'environnement temporaires
    export USE_WEBHOOK=true
    export WEBHOOK_URL="$ngrok_url"

    # Lancer nodemon
    nodemon server.js
}

# Exécuter le script principal
main
