# Script de développement avec ngrok et configuration automatique du webhook
# Usage: npm run dev

$ErrorActionPreference = "Stop"

# Variables
$NGROK_API = "http://127.0.0.1:4040/api/tunnels"
$PORT = 8080
$NGROK_PROCESS = $null
$NGROK_STARTED_BY_SCRIPT = $false

# Fonction pour logger
function Log-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Log-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Log-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Log-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Fonction de nettoyage au Ctrl+C
function Cleanup {
    Write-Host ""
    Log-Info "Arrêt du serveur..."

    if ($script:NGROK_STARTED_BY_SCRIPT -and $script:NGROK_PROCESS) {
        Log-Info "Arrêt de ngrok (PID: $($script:NGROK_PROCESS.Id))..."
        Stop-Process -Id $script:NGROK_PROCESS.Id -Force -ErrorAction SilentlyContinue
        Log-Success "Ngrok arrêté"
    }

    exit 0
}

# Vérifier si ngrok est installé
function Test-NgrokInstalled {
    try {
        $null = Get-Command ngrok -ErrorAction Stop
        return $true
    }
    catch {
        Log-Error "ngrok n'est pas installé !"
        Log-Info "Téléchargez ngrok depuis: https://ngrok.com/download"
        exit 1
    }
}

# Vérifier si ngrok tourne déjà sur le port 8080
function Test-NgrokRunning {
    Log-Info "Vérification si ngrok tourne déjà..."

    try {
        $response = Invoke-WebRequest -Uri $NGROK_API -UseBasicParsing -ErrorAction SilentlyContinue
        $tunnels = $response.Content | ConvertFrom-Json

        foreach ($tunnel in $tunnels.tunnels) {
            if ($tunnel.config.addr -eq "http://localhost:8080") {
                Log-Success "Ngrok détecté (déjà en cours d'exécution)"
                return $true
            }
        }
    }
    catch {
        # L'API ngrok n'est pas accessible
    }

    return $false
}

# Récupérer l'URL publique de ngrok
function Get-NgrokUrl {
    Log-Info "Récupération de l'URL ngrok..."

    $maxAttempts = 30
    $attempt = 0

    while ($attempt -lt $maxAttempts) {
        try {
            $response = Invoke-WebRequest -Uri $NGROK_API -UseBasicParsing -ErrorAction Stop
            $tunnels = $response.Content | ConvertFrom-Json

            foreach ($tunnel in $tunnels.tunnels) {
                if ($tunnel.public_url -like "https://*") {
                    return $tunnel.public_url
                }
            }
        }
        catch {
            # Réessayer
        }

        $attempt++
        Start-Sleep -Seconds 1
    }

    Log-Error "Impossible de récupérer l'URL ngrok après $maxAttempts tentatives"
    return $null
}

# Lancer ngrok
function Start-Ngrok {
    Log-Info "Lancement de ngrok sur le port $PORT..."

    $script:NGROK_PROCESS = Start-Process -FilePath "ngrok" -ArgumentList "http", $PORT -PassThru -WindowStyle Hidden
    $script:NGROK_STARTED_BY_SCRIPT = $true

    Log-Success "Ngrok lancé (PID: $($script:NGROK_PROCESS.Id))"

    # Attendre que ngrok soit prêt
    Start-Sleep -Seconds 3
}

# Configurer le webhook Telegram
function Set-TelegramWebhook {
    param([string]$WebhookUrl)

    Log-Info "Configuration du webhook Telegram..."

    # Charger le token depuis .env
    if (-not (Test-Path ".env")) {
        Log-Error "Fichier .env introuvable !"
        return $false
    }

    $envContent = Get-Content ".env" -Raw
    $botToken = if ($envContent -match "TELEGRAM_BOT_TOKEN=(.+)") { $matches[1].Trim() } else { $null }

    if (-not $botToken) {
        Log-Error "TELEGRAM_BOT_TOKEN non trouvé dans .env !"
        return $false
    }

    # Appeler l'API Telegram setWebhook
    $fullWebhookUrl = "$WebhookUrl/webhook"
    $telegramApiUrl = "https://api.telegram.org/bot$botToken/setWebhook"

    try {
        $body = @{
            url = $fullWebhookUrl
            drop_pending_updates = $true
        }

        $response = Invoke-RestMethod -Uri $telegramApiUrl -Method Post -Body $body -ErrorAction Stop

        if ($response.ok) {
            Log-Success "Webhook Telegram configuré: $fullWebhookUrl"
            return $true
        }
        else {
            Log-Error "Échec de la configuration du webhook Telegram"
            Log-Error "Réponse: $($response | ConvertTo-Json)"
            return $false
        }
    }
    catch {
        Log-Error "Erreur lors de la configuration du webhook: $_"
        return $false
    }
}

# Script principal
function Main {
    Write-Host ""
    Log-Info "=== Démarrage du serveur en mode webhook avec ngrok ==="
    Write-Host ""

    # Vérifier que ngrok est installé
    Test-NgrokInstalled

    # Vérifier si ngrok tourne déjà
    if (Test-NgrokRunning) {
        Log-Info "Utilisation de l'instance ngrok existante"
    }
    else {
        Log-Info "Aucune instance ngrok détectée"
        Start-Ngrok
    }

    # Récupérer l'URL ngrok
    $ngrokUrl = Get-NgrokUrl

    if (-not $ngrokUrl) {
        Log-Error "Impossible de récupérer l'URL ngrok"
        Cleanup
        exit 1
    }

    Log-Success "URL ngrok: $ngrokUrl"

    # Configurer le webhook Telegram
    if (-not (Set-TelegramWebhook -WebhookUrl $ngrokUrl)) {
        Log-Warning "Le webhook Telegram n'a pas pu être configuré automatiquement"
        Log-Info "Vous pouvez le configurer manuellement en visitant: http://localhost:$PORT/setWebhook"
    }

    Write-Host ""
    Log-Info "=== Configuration terminée ==="
    Log-Info "URL publique: $ngrokUrl"
    Log-Info "Webhook: $ngrokUrl/webhook"
    Log-Info "Démarrage du serveur..."
    Write-Host ""

    # Exporter les variables d'environnement temporaires
    $env:USE_WEBHOOK = "true"
    $env:WEBHOOK_URL = $ngrokUrl

    # Lancer nodemon
    try {
        & nodemon server.js
    }
    finally {
        Cleanup
    }
}

# Trap pour capturer Ctrl+C
trap {
    Cleanup
}

# Exécuter le script principal
Main
