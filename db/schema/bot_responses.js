import {
  pgTable,
  serial,
  integer,
  bigint,
  text,
  timestamp,
  varchar,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { conversations } from './conversations.js';

/**
 * Table des réponses du bot
 * Enregistre chaque message envoyé par le bot en réponse aux interactions utilisateur
 */
export const botResponses = pgTable(
  'bot_responses',
  {
    id: serial('id').primaryKey(),

    // Lien avec l'interaction utilisateur correspondante
    conversationId: integer('conversation_id')
      .references(() => conversations.id, { onDelete: 'cascade' })
      .notNull(),

    // Identification du chat
    chatId: bigint('chat_id', { mode: 'number' }).notNull(),

    // Données du message Telegram envoyé
    responseMessageId: bigint('response_message_id', { mode: 'number' }),
    responseText: text('response_text'),

    // Type de réponse
    responseType: varchar('response_type', { length: 50 }).notNull(),
    // Valeurs possibles: 'text', 'document', 'search_results', 'error', 'callback_answer'

    // Données spécifiques selon le type de réponse
    searchResultsCount: integer('search_results_count'), // Si response_type = 'search_results'

    // Métadonnées flexibles (JSON)
    metadata: jsonb('metadata'),
    // Peut contenir: file_id (pour documents), error_details, keyboard_markup, etc.

    // Horodatage
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Indexes pour optimiser les requêtes
    conversationIdIdx: index('idx_bot_responses_conversation_id').on(table.conversationId),
    chatIdIdx: index('idx_bot_responses_chat_id').on(table.chatId),
    createdAtIdx: index('idx_bot_responses_created_at').on(table.createdAt),
    responseTypeIdx: index('idx_bot_responses_response_type').on(table.responseType),
  })
);
