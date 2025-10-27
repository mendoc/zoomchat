# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ZoomChat** is a Telegram bot that helps users find classified ads from the Zoom Hebdo publication. The system consists of two main components:

1. **Telegram Bot** (Node.js) - Interactive search and query interface for users
2. **Auto-notification System** (Google Apps Script) - Automatically forwards new Zoom Hebdo publications to Telegram

Built with Node.js and deployed on Google Cloud Platform (GCP) Cloud Functions, with automated email monitoring via Google Apps Script.

## Technology Stack

### Telegram Bot
- **Runtime**: Node.js 18+ (ES Modules)
- **Bot Framework**: [grammy](https://grammy.dev/) - Modern Telegram bot framework
- **Database**: PostgreSQL (via pg driver)
- **LLM Extraction**: Google Gemini 2.5 Flash for intelligent ad extraction
- **PDF Processing**: pdf-lib for PDF page splitting
- **Deployment**: GCP Cloud Run (serverless, containerized)
- **Environment**: dotenv for configuration management

### Auto-notification System
- **Platform**: Google Apps Script (server-side JavaScript)
- **Trigger**: External cron job via cron-job.org (every 5 minutes)
- **Services**: Gmail API, UrlFetchApp, Logger

## Architecture

### System Overview

The ZoomChat system uses a dual-component architecture:
- **Telegram Bot** handles user interactions and searches
- **Google Apps Script** monitors Gmail and auto-forwards new publications

### Telegram Bot Components

1. **src/bot.js** - Bot logic and command handlers
   - `createBot(token)`: Factory function that creates and configures the bot instance
   - `notifyAdmin(bot, action, userData, error)`: Sends notifications to admin when users subscribe/unsubscribe
   - Command handlers: `/start`, `/aide`, `/abonner`, `/desabonner`
   - Inline keyboard button "S'abonner" displayed conditionally (only for non-subscribers)
   - Callback query handler for `subscribe` action
   - Subscription management integration
   - Admin notifications for subscription events (success and errors)
   - Error handling middleware

2. **src/index.js** - Entry point and webhook handler
   - `telegramWebhook`: HTTP function for GCP Cloud Functions (webhook endpoint)
   - `setWebhook`: Helper function to configure Telegram webhook URL
   - `startDevelopment`: Local development mode using polling instead of webhooks
   - Database initialization on startup

3. **src/database.js** - PostgreSQL database operations
   - `initDatabase()`: Creates all tables (subscribers, parutions, envois, annonces)
   - `addSubscriber(chatId, nom, telephone)`: Adds or updates a subscriber
   - `removeSubscriber(chatId)`: Deactivates a subscription
   - `getSubscriber(chatId)`: Retrieves subscriber information
   - `getAllActiveSubscribers()`: Returns all active subscribers
   - `addParution(data)`: Saves a new parution
   - `saveAnnonce(data)`: Saves an extracted ad with all fields
   - `searchAnnonces(query, limit)`: Searches ads by keywords (title, description, category, location, type, reference)
   - `closeDatabase()`: Closes the database connection pool
   - Uses connection pooling for efficient resource management

4. **src/pdfSplitter.js** - PDF splitting and page extraction
   - `downloadPDF(url)`: Downloads PDF from URL
   - `splitPDF(pdfBuffer, pageNumbers)`: Extracts specific pages (1, 3, 5, 6, 7) as individual PDFs
   - `downloadAndSplitPDF(pdfUrl)`: Complete pipeline (download → split pages)
   - Uses pdf-lib to manipulate PDF documents

5. **src/geminiExtractor.js** - LLM-powered ad extraction with Gemini
   - `extractAnnoncesFromPage(pdfBuffer, pageNumber, maxRetries)`: Analyzes one page with Gemini 2.5 Flash
   - `extractAllAnnonces(pages)`: Processes all pages sequentially with retry logic
   - `cleanAnnonce(annonce)`: Validates and normalizes extracted data
   - Uses Google Gemini 2.5 Flash to understand multi-column layouts
   - **Retry logic**: Automatic retry with exponential backoff (1s, 3s, 10s) when model is overloaded
   - Extracts structured fields: category, subcategory, title, reference, description, contact, price, location
   - Only pages 1, 3, 5, 6, 7 are processed (pages containing ads)

6. **schema.sql** - Database schema definition
   - Defines all tables: `subscribers`, `parutions`, `envois`, `annonces`
   - `annonces` table includes: parution_id, category, subcategory, title, reference, description, contact, price, location
   - Uses PostgreSQL full-text search (tsvector) for optimized search
   - Includes indexes for performance optimization (GIN index on search_vector)
   - Contains column documentation

### Auto-notification System (Code.gs)

3. **Code.gs** - Google Apps Script for automated PDF delivery
   - `checkNewEmails()`: Main function triggered every 5 minutes by cron-job.org
     - Searches for unread emails from `no-reply@zoomhebdo.com`
     - Extracts parution URL from email HTML body
     - Fetches PDF metadata and sends to Telegram
     - Marks emails as read to prevent duplicates

   - `getParutionData(parutionUrl)`: Extracts publication metadata
     - Fetches the parution webpage
     - Extracts issue number, date range, and PDF URL via regex
     - Returns structured data object

   - `sendParutionPDF(pdfUrl, botToken, chatId, caption, fileName)`: Sends PDF to Telegram
     - Downloads PDF from Zoom Hebdo website
     - Uploads to Telegram via `sendDocument` API
     - Formats filename and caption

### Deployment Modes

- **Development**: Local polling mode (`NODE_ENV=development`)
  - Bot polls Telegram API for updates
  - No webhook required
  - Run with `npm run dev`

- **Production**: Webhook mode (GCP Cloud Functions)
  - Telegram sends updates via HTTP POST to Cloud Function
  - Serverless, pay-per-use model
  - Deploy with `gcloud functions deploy`

## Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start bot locally (polling mode)
npm start            # Start bot (checks NODE_ENV)
```

### Versioning & Releases
```bash
npm run release         # Auto-detect version bump based on conventional commits
npm run release:major   # Force MAJOR version bump (1.0.0 → 2.0.0)
npm run release:minor   # Force MINOR version bump (1.0.0 → 1.1.0)
npm run release:patch   # Force PATCH version bump (1.0.0 → 1.0.1)
npm run release:first   # First release (doesn't bump version)
```

### Deployment
```bash
# Deploy webhook handler
gcloud functions deploy telegramWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point telegramWebhook \
  --region europe-west1 \
  --set-env-vars TELEGRAM_BOT_TOKEN=your_token

# Deploy webhook setup function
gcloud functions deploy setWebhook \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point setWebhook \
  --region europe-west1 \
  --set-env-vars TELEGRAM_BOT_TOKEN=your_token,WEBHOOK_URL=your_function_url
```

## Environment Variables

Required in `.env` file:
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather
- `WEBHOOK_URL`: GCP Cloud Function URL (for production)
- `NODE_ENV`: `development` or `production`
- `DATABASE_URL`: PostgreSQL connection string (format: `postgresql://user:password@host:port/database`)
- `ADMIN_CHAT_ID`: Telegram chat ID of the admin to receive subscription notifications (optional)
- `GEMINI_API_KEY`: Google Gemini API key for LLM ad extraction (required for PDF processing)

## Development Notes

### Telegram Bot
- The bot uses ES Modules (`"type": "module"` in package.json)
- All user-facing messages are in French
- grammy provides TypeScript-like middleware architecture even in JavaScript
- The `webhookCallback` adapter handles the conversion between GCP HTTP format and grammy's update format
- In development, webhook must be deleted (`bot.api.deleteWebhook()`) before starting polling mode
- Inline keyboards are used for interactive buttons (e.g., "S'abonner" button)
- Subscription button is shown conditionally: visible only for non-subscribed users in `/start` and `/aide` commands
- Callback queries handle button interactions without requiring users to type commands
- Admin notifications: When `ADMIN_CHAT_ID` is configured, the admin receives formatted notifications for all subscription/unsubscription events, including user details (name, username, chat ID), timestamp, and total active subscribers count

### Database
- PostgreSQL is used to store subscriber information and extracted ads
- The database is automatically initialized on startup via `initDatabase()`
- Uses connection pooling for efficient resource management
- SSL is enabled in production mode, disabled in development
- **Tables**:
  - `subscribers`: chat_id, nom, telephone, date_abonnement, actif
  - `parutions`: numero, periode, pdf_url, telegram_file_id, date_parution
  - `annonces`: parution_id, categorie, titre, reference, description, telephone, prix, localisation, type_bien_service, email
  - `envois`: parution_id, subscriber_id, statut, error_message, sent_at
- Subscribers can be deactivated (soft delete) rather than deleted
- Uses `ON CONFLICT` clause for upsert operations

### LLM Ad Extraction with Gemini
- **Model**: Google Gemini 2.5 Flash for cost-effective, accurate extraction
- **Process**:
  1. PDF is split into individual pages (only pages 1, 3, 5, 6, 7 are extracted)
  2. Each page PDF is sent to Gemini 2.5 Flash with a structured prompt
  3. LLM analyzes visual layout, handles multi-column formats
  4. Returns JSON with structured ad data
  5. Retry logic handles model overload errors automatically
- **Advantages**:
  - Direct PDF processing (no image conversion needed)
  - Automatically filters non-ad pages
  - Extracts all fields: category, subcategory, title, reference, description, contact, price, location
  - **Robust error handling**: Exponential backoff retry (1s, 3s, 10s) when model is overloaded
  - No need for complex regex patterns
  - More economical than OpenAI (~10x cheaper)
- **Pages processed**: Only 1, 3, 5, 6, 7 (configurable in `src/pdfSplitter.js`)
- **Rate limiting**: 500ms pause between page requests to respect API limits

### Auto-notification System
- Code.gs is deployed to Google Apps Script and linked to a Gmail account
- External trigger via cron-job.org (every 5 minutes) calls the `checkNewEmails` function
- Email search query: `in:inbox from:no-reply@zoomhebdo.com is:unread`
- PDF extraction uses regex patterns to parse HTML from zoomhebdo.com
- Bot token and chat ID are hardcoded in Code.gs (lines 37-38)
- The script automatically marks processed emails as read to prevent re-processing

### Workflow
1. User subscribes to Zoom Hebdo email notifications
2. New publication email arrives in Gmail inbox
3. cron-job.org triggers `checkNewEmails()` every 5 minutes
4. Code.gs extracts PDF and sends to Telegram chat
5. Users can subscribe via `/abonner` to receive PDFs automatically
6. Code.gs queries the database for active subscribers and sends PDFs to all of them
7. Users can interact with the bot to search within publications (feature in development)

### Version Management
- **Conventional Commits**: The project uses [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages
- **Semantic Versioning**: Follows [semver](https://semver.org/) (MAJOR.MINOR.PATCH)
- **Automated Versioning**: `standard-version` automatically:
  - Analyzes commit messages to determine version bump type
  - Updates `package.json` version
  - Generates/updates `CHANGELOG.md`
  - Creates a release commit
- **Commit Types**:
  - `feat:` → MINOR bump (new feature)
  - `fix:` → PATCH bump (bug fix)
  - `BREAKING CHANGE:` or `!` → MAJOR bump (breaking change)
  - Other types (`docs:`, `refactor:`, etc.) → no version bump
- **Configuration**: `.versionrc.json` contains standard-version configuration
- **Workflow**: See `CONTRIBUTING.md` for detailed contribution guidelines
- to memorize Ne mentionne jamais claude code dans les messages de commit