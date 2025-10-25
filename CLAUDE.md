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
- **Deployment**: GCP Cloud Functions (serverless, webhook-based)
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
   - Command handlers: `/start`, `/aide`
   - Error handling middleware

2. **src/index.js** - Entry point and webhook handler
   - `telegramWebhook`: HTTP function for GCP Cloud Functions (webhook endpoint)
   - `setWebhook`: Helper function to configure Telegram webhook URL
   - `startDevelopment`: Local development mode using polling instead of webhooks

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

## Development Notes

### Telegram Bot
- The bot uses ES Modules (`"type": "module"` in package.json)
- All user-facing messages are in French
- grammy provides TypeScript-like middleware architecture even in JavaScript
- The `webhookCallback` adapter handles the conversion between GCP HTTP format and grammy's update format
- In development, webhook must be deleted (`bot.api.deleteWebhook()`) before starting polling mode

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
5. Users can then interact with the bot to search within publications
