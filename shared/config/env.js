import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  // Telegram Bot
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  ADMIN_CHAT_ID: z.string().optional(),
  WEBHOOK_URL: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // Google Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),

  // Environment
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('8080'),
  USE_WEBHOOK: z.string().transform(val => val === 'true').optional(),
});

function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    console.error('Environment validation failed:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

export const env = validateEnv();
