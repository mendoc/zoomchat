# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZoomChat** is a Telegram bot that helps users find classified ads from the Zoom Hebdo publication using semantic vector search. The system consists of two main components:

1. **Telegram Bot** (Node.js + Express) - Interactive search and query interface with vector similarity search
2. **Auto-notification System** (Google Apps Script) - Automatically forwards new Zoom Hebdo publications to Telegram

Built with Node.js, Express, and Drizzle ORM, deployed on Google Cloud Platform (GCP) Cloud Run as a containerized service.

## Technology Stack

### Telegram Bot
- **Runtime**: Node.js 18+ (ES Modules)
- **Web Framework**: Express 5
- **Bot Framework**: [grammy](https://grammy.dev/) - Modern Telegram bot framework
- **Database**: PostgreSQL with pgvector extension for semantic search
- **ORM**: Drizzle ORM (type-safe, performant)
- **LLM Services**: Google Gemini 2.5 Flash for extraction + embedding-001 for vector search
- **PDF Processing**: pdf-lib for PDF page splitting
- **Logging**: Native console with logger wrapper
- **Validation**: Zod schemas
- **Deployment**: GCP Cloud Run (containerized, auto-scaling)
- **Containerization**: Docker with multi-stage builds

### Auto-notification System
- **Platform**: Google Apps Script (server-side JavaScript)
- **Trigger**: External cron job via cron-job.org (every 5 minutes)
- **Services**: Gmail API, UrlFetchApp, Logger

## Architecture

### Modular Design Principles

The codebase uses a clean layered architecture with clear separation of concerns:

```
server.js                 # Entry point: Express app, DI container
├── bot/                  # Telegram bot layer
│   ├── BotFactory.js     # Bot configuration and wiring
│   ├── commands/         # Command handlers (/start, /aide, etc.)
│   ├── handlers/         # Text & callback query handlers
│   └── keyboards/        # Inline keyboard builders
├── routes/               # HTTP endpoints (REST API)
│   ├── WebhookRoute.js   # Telegram webhook handler
│   ├── SearchRoute.js    # GET /search
│   ├── ParutionRoute.js  # POST /parution (register parution)
│   ├── ExtractRoute.js   # POST /extract (extract ads from PDF)
│   └── NotifyRoute.js    # POST /notify (mass notification)
├── services/             # Business logic layer
│   ├── extraction/       # PDF processing & LLM extraction
│   ├── search/           # Vector search & embeddings
│   └── notification/     # Admin notifications
├── models/               # Data access layer (repositories)
│   ├── SubscriberRepository.js
│   ├── ParutionRepository.js
│   ├── AnnonceRepository.js
│   ├── EnvoiRepository.js
│   └── ConversationRepository.js
├── db/                   # Database configuration
│   ├── connection.js     # Drizzle ORM + pg pool
│   └── schema/           # Drizzle schema definitions
├── middleware/           # Express middleware
│   ├── LoggerMiddleware.js
│   └── ErrorMiddleware.js
├── bot/middleware/       # Bot-specific middleware
│   └── ConversationLogger.js  # Conversation tracking middleware
├── shared/               # Shared utilities
│   ├── config/env.js     # Environment variables
│   ├── logger.js         # Logger wrapper (console)
│   ├── errors.js         # Custom error classes
│   └── SessionManager.js # Session management for conversations
└── locales/              # Internationalization
    ├── bot-messages.js   # User-facing messages
    ├── admin-messages.js # Admin notifications
    └── prompts/          # LLM prompts
```

### Key Architectural Patterns

1. **Repository Pattern**: All database access goes through repository classes (`models/`)
   - Clean separation between business logic and data access
   - Drizzle ORM queries encapsulated in repositories
   - Reusable across routes and services

2. **Service Layer**: Complex business logic lives in service classes (`services/`)
   - `ExtractionOrchestrator`: Coordinates PDF → Gemini → Embeddings → DB pipeline
   - `VectorSearchService`: Handles semantic search with relevance filtering
   - `AdminNotifier`: Sends formatted notifications to admin

3. **Dependency Injection**: Dependencies are injected via constructors
   - `server.js` acts as the DI container
   - Makes testing easier and reduces coupling
   - Clear dependency graph visible in `server.js`

4. **Factory Pattern**: `BotFactory.create()` centralizes bot configuration
   - Registers all commands and handlers
   - Configures error handling middleware
   - Returns fully configured Bot instance

### Core Components

**server.js** - Application entry point
- Creates Express app
- Initializes all repositories and services
- Configures routes (webhook, search, extract, health)
- Handles development (polling) vs production (webhook) modes
- Graceful shutdown on SIGINT/SIGTERM

**bot/BotFactory.js** - Bot configuration factory
- `BotFactory.create(token, dependencies)`: Creates and wires up the bot
- Registers command handlers: `/start`, `/aide`, `/dernier`, `/abonner`, `/desabonner`
- Registers text handler (for search queries) and callback handler (for inline buttons)
- Configures error handling middleware

**services/extraction/ExtractionOrchestrator.js** - Extraction pipeline orchestrator
- `extractParution(numero, options)`: Complete extraction workflow
  1. Fetch parution from DB
  2. Download and split PDF pages (1, 3, 5, 6, 7)
  3. Extract ads with Gemini 2.5 Flash (with retry logic)
  4. Save valid ads to DB (filter out ads without references)
  5. Generate embeddings for new ads
  6. Update ads with embeddings
- Returns detailed stats (duration, counts, errors)

**services/search/VectorSearchService.js** - Semantic search engine
- `search(query, options)`: End-to-end search pipeline
  1. Generate embedding for user query
  2. Perform pgvector similarity search via repository
  3. Filter results by relevance using Gemini (optional)
  4. Return ranked results with scores
- Pure vector search (no keyword matching)

**models/AnnonceRepository.js** - Annonces data access
- `vectorSearch(embedding, options)`: pgvector cosine similarity query
- `bulkCreate(annonces)`: Batch insert with conflict handling
- `bulkUpdateEmbeddings(annonces)`: Efficient batch embedding updates
- `findWithoutEmbedding(parutionId)`: Find ads missing embeddings
- Uses Drizzle ORM for type-safe queries

**db/connection.js** - Database connection
- Creates PostgreSQL connection pool
- Initializes Drizzle ORM with schema
- Exports `db` instance (Drizzle) and `getPool()` for raw queries
- SSL enabled in production, disabled in development

### Conversation History System

Le système de tracking des conversations enregistre automatiquement toutes les interactions utilisateur et réponses du bot pour analyse et amélioration.

**Architecture:**

1. **Tables de base de données**:
   - `conversations` - Enregistre chaque interaction utilisateur (commandes, recherches, callbacks)
     - Champs: subscriber_id, chat_id, session_id, interaction_type, message_text, command_name, callback_data, search_query, metadata, created_at
     - Indexes: chat_id, subscriber_id, session_id, created_at, interaction_type
   - `bot_responses` - Enregistre chaque réponse du bot
     - Champs: conversation_id, chat_id, response_message_id, response_text, response_type, parution_id, metadata, created_at
     - `parution_id` (integer, FK vers parutions): ID de la parution dont est issue l'annonce retournée (une réponse = une annonce = une parution)
     - Indexes: conversation_id, chat_id, created_at, response_type

2. **SessionManager** (`shared/SessionManager.js`):
   - Gère les sessions de conversation avec timeout de 30 minutes
   - Génère des UUID pour identifier les sessions
   - Cache en mémoire avec nettoyage périodique automatique (toutes les 5 minutes)
   - Méthodes: `getOrCreateSession()`, `getCurrentSession()`, `createNewSession()`, `endSession()`

3. **ConversationRepository** (`models/ConversationRepository.js`):
   - Méthodes de logging:
     - `logInteraction()` - Enregistre une interaction utilisateur
     - `logBotResponse()` - Enregistre une réponse du bot
   - Méthodes d'analyse:
     - `getConversationHistory()` - Récupère l'historique complet avec pagination
     - `getRecentInteractions()` - Dernières N interactions
     - `getSessionInteractions()` - Toutes les interactions d'une session
     - `getInteractionStats()` - Statistiques par type d'interaction
     - `getTopSearchQueries()` - Requêtes les plus fréquentes
     - `getTopCommands()` - Commandes les plus utilisées
     - `getMostSearchedParutions()` - Parutions les plus recherchées (top N par fréquence d'apparition)
     - `getParutionSearchStats(parutionId)` - Statistiques détaillées pour une parution (apparitions, utilisateurs uniques, dates)

4. **ConversationLogger** (`bot/middleware/ConversationLogger.js`):
   - Middleware grammy qui intercepte automatiquement toutes les interactions
   - **Logging utilisateur**: Détecte automatiquement le type d'interaction (command, text_query, callback_query)
   - **Logging réponses**: Monkey-patching de `ctx.reply()`, `ctx.replyWithDocument()`, `ctx.answerCallbackQuery()`, `ctx.editMessageText()`
   - **Non-bloquant**: Les erreurs de logging ne bloquent pas le bot
   - Enregistré AVANT tous les handlers dans `BotFactory.js`

**Intégration dans BotFactory**:
```javascript
// Le middleware est enregistré en premier dans la chaîne
const conversationLogger = new ConversationLogger(conversationRepo, subscriberRepo, sessionManager);
bot.use(conversationLogger.middleware());
// Puis les handlers (commands, text, callbacks)
```

**Types d'interactions trackées**:
- `command` - Commandes Telegram (/start, /aide, /dernier, etc.)
- `text_query` - Requêtes de recherche textuelles
- `callback_query` - Clics sur les boutons inline

**Types de réponses trackées**:
- `text` - Réponses textuelles simples
- `document` - Envoi de documents (PDF)
- `search_results` - Résultats de recherche
- `error` - Messages d'erreur
- `callback_answer` - Réponses aux callback queries

**Cas d'usage**:
- Analyser les requêtes des utilisateurs pour améliorer les prompts
- Identifier les commandes les plus utilisées
- Détecter les patterns de recherche
- Mesurer l'engagement des utilisateurs par session
- Améliorer la pertinence des résultats de recherche

### Deployment Modes

- **Development** (`NODE_ENV=development`):
  - **Webhook mode by default** (`npm run dev`)
    - Automatically launches ngrok if not already running
    - Retrieves public URL from ngrok API
    - Configures Telegram webhook automatically
    - Sets temporary environment variables (`USE_WEBHOOK=true`, `WEBHOOK_URL=<ngrok_url>`)
    - HTTP server handles webhook and API routes on port 8080
    - Script: `scripts/dev-with-webhook.sh`
  - **Polling mode (alternative)** (`npm run dev:polling`)
    - Simple polling mode without webhook
    - No ngrok required
    - HTTP server runs on port 8080 for API routes only
    - Native console logging

- **Production** (GCP Cloud Run):
  - Bot **always** uses webhook mode (forced, `USE_WEBHOOK` ignored)
  - Express server handles both webhook and API routes
  - Container auto-scales based on traffic
  - JSON logs for Cloud Logging
  - Deploy with `npm run deploy`

## Common Commands

### Development
```bash
npm install           # Install dependencies
npm run dev           # Start bot with ngrok webhook (auto-configured, default mode)
npm run dev:polling   # Start bot in polling mode (no webhook, no ngrok)
npm start             # Start bot (checks NODE_ENV for webhook/polling)
```

**Development with ngrok (default)**:
- `npm run dev` automatically:
  1. Checks if ngrok is running on port 8080
  2. Launches ngrok if not detected
  3. Retrieves public URL from ngrok API
  4. Configures Telegram webhook automatically
  5. Starts server with temporary env vars (no .env modification)
- Requires ngrok installed: https://ngrok.com/download
- Press Ctrl+C to stop (auto-cleanup if ngrok was launched by script)

### Database Management
```bash
npm run db:generate   # Generate Drizzle migrations from schema changes
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio (database GUI)
```

### Ad Extraction
```bash
npm run extract       # Run extraction script (prompts for parution number)
# Or with scripts directly:
node scripts/extractor.js <numero>  # Extract ads from specific parution
```

### Linting & Formatting

Le projet utilise **ESLint** et **Prettier** pour maintenir la qualité et la cohérence du code.

**Commandes disponibles** :
```bash
npm run lint          # Vérifier le code (affiche les erreurs/warnings)
npm run lint:fix      # Corriger automatiquement les erreurs de linting
npm run lint:ci       # Vérification stricte pour CI/CD (échoue si warnings)
npm run format        # Formatter tout le code avec Prettier
npm run format:check  # Vérifier le formatage sans modifier les fichiers
```

**Intégration avec Git** :
- Le hook `pre-commit` exécute automatiquement `npm run lint:ci` avant chaque commit
- Si le linting échoue, le commit est bloqué avec un message clair
- Corrigez les erreurs avec `npm run lint:fix` ou manuellement, puis recommitez

**Configuration** :
- **ESLint** : `eslint.config.js` (flat config, ESLint 9+)
  - Règles adaptées au style existant du projet (single quotes, 2 spaces, semicolons)
  - Intégration avec Prettier pour éviter les conflits
- **Prettier** : `.prettierrc.json`
  - Configuration harmonisée avec ESLint
  - Fichiers exclus : `.prettierignore`

**Style de code appliqué** :
- Indentation : 2 espaces
- Guillemets : simples (`'`)
- Semicolons : toujours présents
- Trailing commas : seulement en multi-ligne
- Arrow functions : préférées pour les callbacks

**Approche progressive** :
- Le code existant n'est **pas modifié automatiquement**
- Le linting s'applique uniquement aux **nouveaux commits**
- Vous pouvez linter/formater manuellement avec `npm run lint:fix` ou `npm run format`

### Versioning & Releases

**Workflow automatique** (recommandé) - Le versioning se fait automatiquement :
```bash
git commit -m "feat: votre message"
```
Un hook Git `pre-commit` s'exécute automatiquement et :
- Analyse le message de commit (doit suivre Conventional Commits)
- Bump la version selon le type (feat → MINOR, fix → PATCH, etc.)
- Met à jour `package.json`, `package-lock.json` et `CHANGELOG.md`
- Inclut ces fichiers dans le commit

**Installation du hook** :
```bash
npm install              # S'installe automatiquement via postinstall
# Ou manuellement :
npm run postinstall      # Installe le hook .git/hooks/pre-commit
```

**Alternative manuelle** - Si vous préférez contrôler le versioning :
```bash
npm run commit:auto "feat: votre message"  # Script qui fait tout en une commande
```

**Commandes de versioning manuel** :
```bash
npm run release         # Auto-detect version bump based on conventional commits
npm run release:major   # Force MAJOR version bump (1.0.0 → 2.0.0)
npm run release:minor   # Force MINOR version bump (1.0.0 → 1.1.0)
npm run release:patch   # Force PATCH version bump (1.0.0 → 1.0.1)
```

### Deployment

Le projet supporte **deux modes de déploiement** sur Google Cloud Run :

1. **Déploiement automatique via Cloud Build** (push sur GitHub)
2. **Déploiement manuel local** (build Docker local)

#### Mode 1 : Déploiement automatique (Cloud Build)

**Déclenchement automatique** : À chaque `git push` sur la branche `main`, un Cloud Build se déclenche automatiquement via un trigger GitHub.

**Caractéristiques** :
- ✅ **Automatique** : Pas besoin de lancer de commande manuelle
- ✅ **Versioning automatique** : Le numéro de version depuis `package.json` est utilisé comme suffixe de révision Cloud Run (ex: `v10-1-4`)
- ✅ **Traçabilité** : Chaque révision Cloud Run correspond à une version Git spécifique
- ⚠️ **Coûts** : Utilise les minutes de build Cloud Build (120 minutes/jour gratuites)

**Configuration** : Le fichier `cloudbuild.yaml` définit le workflow de build et déploiement.

**Workflow automatique** :
1. Extraction du numéro de version depuis `package.json`
2. Build de l'image Docker sur Cloud Build
3. Push vers Google Container Registry avec tag de version
4. Déploiement sur Cloud Run avec révision nommée `v{VERSION}` (ex: `v10-1-4`)

**Pour déclencher un déploiement automatique** :
```bash
git push   # Le trigger GitHub Cloud Build se déclenche automatiquement
```

#### Mode 2 : Déploiement manuel local (économique)

**Caractéristiques** :
- ✅ **Économique** : Build 100% local, pas de coût Cloud Build
- ✅ **Contrôle** : Déploiement manuel à la demande
- ⚠️ **Prérequis** : Docker Desktop installé et démarré

**Prérequis** :
- **Docker Desktop** doit être installé et démarré
- Authentification GCP configurée : `gcloud auth login`

**Commandes disponibles** :

**Option 1 : Déploiement complet (push Git + deploy)**
```bash
git deploy   # Alias Git qui fait git push puis npm run deploy
```

**Option 2 : Déploiement sans push Git**
```bash
npm run deploy   # Build local + push GCR + déploiement Cloud Run
```

#### Comment ça fonctionne (`scripts/deploy.sh`)

Le script de déploiement effectue les étapes suivantes :

1. **Vérifications** :
   - Vérifie que `.env.prod` existe
   - Vérifie que Docker est installé et démarré
   - Configure l'authentification Docker pour GCR (si nécessaire)

2. **Build de l'image Docker localement** :
   ```bash
   docker build -t gcr.io/zoomchat-476308/zoomchat:VERSION .
   ```
   - Build avec `--platform linux/amd64` pour compatibilité Cloud Run
   - Tag avec numéro de version depuis `package.json`
   - Tag également avec `latest`

3. **Push vers Google Container Registry** :
   ```bash
   docker push gcr.io/zoomchat-476308/zoomchat:VERSION
   docker push gcr.io/zoomchat-476308/zoomchat:latest
   ```
   - Aucun coût Cloud Build (build 100% local)
   - Coût de stockage : ~$0.008/mois pour une image de 300 MB

4. **Déploiement sur Cloud Run** :
   ```bash
   gcloud run deploy zoomchat-bot \
     --image gcr.io/zoomchat-476308/zoomchat:VERSION \
     --region europe-west1 \
     --set-env-vars "..." \
     --revision-suffix "vX-X-X"
   ```
   - Déploie l'image depuis GCR (pas de build cloud)
   - Économie de ~92% sur les coûts de build

5. **Configuration du webhook** (optionnel) :
   - Le script propose de configurer le webhook Telegram automatiquement

#### Commandes utiles

```bash
# Lister les images dans GCR
gcloud container images list --repository=gcr.io/zoomchat-476308

# Voir les tags d'une image
gcloud container images list-tags gcr.io/zoomchat-476308/zoomchat

# Supprimer une vieille image (nettoyage)
gcloud container images delete gcr.io/zoomchat-476308/zoomchat:VERSION

# Voir les logs Cloud Run
gcloud run services logs tail zoomchat-bot --region europe-west1

# Accéder à la console Cloud Run
https://console.cloud.google.com/run/detail/europe-west1/zoomchat-bot/metrics?project=zoomchat-476308
```

## Environment Variables

Required in `.env` file:
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather
- `WEBHOOK_URL`: GCP Cloud Function URL (for production)
- `NODE_ENV`: `development` or `production`
- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://user:password@host:port/database`)
- `ADMIN_CHAT_ID`: Telegram chat ID of the admin to receive subscription notifications (optional)
- `GEMINI_API_KEY`: Google Gemini API key for LLM ad extraction (required for PDF processing)
- `USE_WEBHOOK`: `true` or `false` (optional, development only) - Controls bot mode in development. Defaults to `false` (polling). Set to `true` to test webhook mode locally (requires ngrok or similar). **Ignored in production** (always webhook).

## Development Notes

### Code Organization Best Practices

**When adding new features:**
1. **Commands**: Add to `bot/commands/` (extend base command pattern)
2. **HTTP Routes**: Add to `routes/` (create route class with `handle()` method)
3. **Business Logic**: Add to `services/` (use dependency injection)
4. **Data Access**: Add methods to existing repositories in `models/` or create new repository
5. **Localization**: Add messages to `locales/bot-messages.js` or `locales/admin-messages.js`
6. **Database Schema**: Update Drizzle schema in `db/schema/`, then run `npm run db:generate`

**Dependency Injection Pattern:**
- All dependencies are injected via constructors
- `server.js` acts as the DI container (initializes all repositories and services)
- Never instantiate repositories or services inside classes - always inject them

**Error Handling:**
- Use custom error classes from `shared/errors.js`
- Middleware `ErrorMiddleware.js` handles all HTTP errors
- Bot errors are caught by grammy's `.catch()` middleware in `BotFactory.js`

### Telegram Bot

- **ES Modules**: All files use `import/export` (configured via `"type": "module"` in package.json)
- **Localization**: All user-facing messages are in French, stored in `locales/bot-messages.js`
- **Command Pattern**: Each command is a class with a `handle(ctx)` method
- **Webhook vs Polling**: Automatically determined by `NODE_ENV` in `server.js`
  - Development: Webhook deleted, then `bot.start()` for polling
  - Production: Webhook configured at `/webhook` route
- **Inline Keyboards**: Built using `keyboards/SubscribeKeyboard.js`
  - Subscribe button shown conditionally (only for non-subscribers)
  - Handled via `CallbackHandler.js`
- **Admin Notifications**: `AdminNotifier` service sends formatted notifications to `ADMIN_CHAT_ID`
  - Subscription events include user details, timestamp, total active subscribers

### Database (Drizzle ORM + PostgreSQL)

- **ORM**: Drizzle ORM for type-safe, SQL-like queries
- **Connection**: Single connection pool initialized in `db/connection.js`
- **Schema**: Defined using Drizzle schema builders in `db/schema/`
- **Migrations**: Generate with `npm run db:generate`, apply with `npm run db:migrate`
- **Vector Extension**: Uses pgvector extension for semantic search (HNSW index)
- **Tables**:
  - `subscribers`: chat_id, nom, telephone, date_abonnement, actif
  - `parutions`: numero, periode, pdf_url, telegram_file_id, date_parution
  - `annonces`: parution_id, categorie, titre, reference, description, telephone, prix, localisation, embedding (vector 1536)
  - `envois`: parution_id, subscriber_id, statut, error_message, sent_at
  - `conversations`: subscriber_id, chat_id, session_id, interaction_type, message_text, command_name, callback_data, search_query, metadata, created_at
  - `bot_responses`: conversation_id, chat_id, response_message_id, response_text, response_type, parution_id, metadata, created_at
- **Soft Deletes**: Subscribers are deactivated (actif=false), not deleted
- **Upserts**: Drizzle's `.onConflictDoUpdate()` for idempotent operations

### LLM Services (Google Gemini)

**Extraction (Gemini 2.5 Flash)**
- **Service**: `services/extraction/GeminiService.js`
- **Process**:
  1. `PdfService` downloads PDF and splits pages (1, 3, 5, 6, 7)
  2. Each page buffer sent to Gemini 2.5 Flash with structured prompt from `locales/prompts/extraction-prompt.js`
  3. LLM analyzes visual layout, returns JSON with structured ad data
  4. Retry logic: Exponential backoff (1s, 3s, 10s) on model overload
- **Advantages**: Direct PDF processing, multi-column understanding, no regex needed
- **Rate Limiting**: 500ms pause between page requests

**Embeddings (Gemini embedding-001)**
- **Service**: `services/search/EmbeddingService.js`
- **Dimensions**: 1536 (stored as PostgreSQL vector type)
- **Composite Text**: category + subcategory + title + location + description
- **Batch Processing**: `generateBatch()` with progress callback
- **Rate Limiting**: 50ms between requests

**Vector Search Pipeline**
- **Service**: `services/search/VectorSearchService.js`
- **Flow**:
  1. Generate query embedding with `EmbeddingService`
  2. Perform pgvector cosine similarity search via `AnnonceRepository.vectorSearch()`
  3. Optional: Filter results with `RelevanceFilterService` (uses Gemini to re-rank)
  4. Return ranked results with similarity scores
- **Configuration**: `minScore` (default: 0.3), `limit` (default: 10)
- **No Keyword Matching**: 100% semantic understanding (handles synonyms, variations, natural language)

### Extraction Workflow

The complete extraction pipeline is orchestrated by `ExtractionOrchestrator`:

1. **Trigger**: POST `/extract` with `{ "numero": "123" }` or run `npm run extract`
2. **Pipeline** (`ExtractionOrchestrator.extractParution()`):
   - Fetch parution from DB
   - Check if already extracted (skip if not `forceExtract`)
   - Download PDF and split into pages 1, 3, 5, 6, 7
   - Extract ads with Gemini 2.5 Flash (retry on failures)
   - Filter out ads without `reference` field
   - Save valid ads to DB
   - Generate embeddings for ads missing them
   - Update DB with embeddings
3. **Admin Notification**: `AdminNotifier` sends extraction stats to admin
4. **Returns**: Stats object with counts, duration, errors

### HTTP API Endpoints

The Express server exposes several HTTP endpoints:

**GET /health**
- Health check endpoint
- Returns: `{ "status": "ok", "timestamp": "..." }`

**GET /search?query=...**
- Semantic search across all ads
- Query params: `query` (required), `limit` (optional, default: 10)
- Returns: JSON array of matching ads with similarity scores

**POST /parution**
- Registers a new parution in the database
- Body: `{ "numero": "123", "periode": "Du 4 au 10 nov", "pdfUrl": "https://...", "dateParution": "2025-11-04T10:30:00Z" }`
- `dateParution`: Email reception date from Google Apps Script
- Returns: Created parution object with ID
- Called by Google Apps Script when new publication is detected

**POST /extract**
- Triggers ad extraction pipeline for a specific parution
- Body: `{ "numero": "123", "forceExtract": false }`
- Requires parution to exist in DB (registered via POST /parution first)
- Workflow:
  1. Downloads and splits PDF pages (1, 3, 5, 6, 7)
  2. Extracts ads using Gemini 2.5 Flash
  3. Saves ads to database
  4. Generates embeddings for new ads
  5. On success: automatically triggers POST /notify for mass distribution
  6. On failure/partial: sends admin notification, does NOT trigger /notify
- Returns: Extraction stats (counts, duration, errors)

**POST /notify**
- Sends PDF to all active subscribers via Telegram
- Body: `{ "numero": "123" }`
- Workflow:
  1. Fetches parution from DB
  2. Uploads PDF to Telegram (if not already uploaded)
  3. Sends document to all active subscribers with rate limiting
  4. Tracks delivery status in `envois` table
  5. Sends admin notification with delivery statistics
- Returns: Delivery stats (total, success, failed)
- Called automatically by POST /extract on successful extraction

**POST /webhook** (production only)
- Telegram webhook endpoint
- Receives updates from Telegram and forwards to bot

**GET /setWebhook** (production only)
- Configures Telegram webhook URL
- Should be called once after deployment

### Auto-notification System (Google Apps Script)

- **Code**: `Code.gs` (not in this repo, deployed separately)
- **Trigger**: cron-job.org calls `checkNewEmails()` every 5 minutes
- **New Workflow** (fire-and-forget approach):
  1. Search Gmail for unread emails from `no-reply@zoomhebdo.com`
  2. Extract parution URL from email HTML
  3. Scrape webpage to get numero, periode, PDF URL
  4. **Register parution**: Call `POST /parution` with email reception date as `dateParution`
  5. **Trigger extraction**: Call `POST /extract` with parution numero (fire-and-forget, no wait)
  6. Mark email as read
- **Server-side workflow** (triggered by Apps Script):
  - Extraction orchestrator processes PDF and extracts ads
  - On success: automatically calls `POST /notify` to send PDF to all subscribers
  - On failure/partial: admin is notified, subscribers do NOT receive PDF
- **Important**: This ensures ads are indexed and searchable BEFORE users receive the PDF

### Version Management (Automated)

- **Conventional Commits**: The project uses [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages
- **Semantic Versioning**: Follows [semver](https://semver.org/) (MAJOR.MINOR.PATCH)
- **Versioning Tool**: `standard-version` for automated version bumping and CHANGELOG generation
- **Configuration**: `.versionrc.json` contains standard-version configuration
- **Git Hook**: Native pre-commit hook automatically bumps version on every commit

**Commit Types**:
- `feat:` → MINOR bump (new feature)
- `fix:` → PATCH bump (bug fix)
- `BREAKING CHANGE:` or `!` → MAJOR bump (breaking change)
- Other types (`docs:`, `refactor:`, etc.) → no version bump

**How it works**:

1. You commit normally: `git commit -m "feat: nouvelle fonctionnalité"`
2. Pre-commit hook executes automatically:
   - Analyzes commit message to determine version bump
   - Runs `standard-version` to update version
   - Updates `package.json`, `package-lock.json`, and `CHANGELOG.md`
   - Adds these files to your commit
3. Commit is created with the updated version

**Hook Installation**:
- Auto-installed via `npm install` (postinstall script)
- Manual install: `npm run postinstall`
- Located at: `.git/hooks/pre-commit`

**Bypassing the hook** (if needed):
```bash
git commit --no-verify -m "message"  # Skip version bump
```