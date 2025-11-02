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
import { subscribers } from './subscribers.js';

/**
 * Table des interactions utilisateur avec le bot
 * Enregistre chaque message, commande ou callback query envoyé par les utilisateurs
 */
export const conversations = pgTable(
  'conversations',
  {
    id: serial('id').primaryKey(),

    // Identification de l'utilisateur
    subscriberId: integer('subscriber_id')
      .references(() => subscribers.id, { onDelete: 'cascade' })
      .notNull(),
    chatId: bigint('chat_id', { mode: 'number' }).notNull(),

    // Gestion des sessions (regroupement des interactions)
    sessionId: varchar('session_id', { length: 100 }).notNull(),

    // Type d'interaction
    interactionType: varchar('interaction_type', { length: 50 }).notNull(),
    // Valeurs possibles: 'command', 'text_query', 'callback_query'

    // Données du message Telegram
    messageId: bigint('message_id', { mode: 'number' }),
    messageText: text('message_text'),

    // Données spécifiques selon le type d'interaction
    commandName: varchar('command_name', { length: 50 }), // Si interaction_type = 'command'
    callbackData: varchar('callback_data', { length: 100 }), // Si interaction_type = 'callback_query'
    searchQuery: text('search_query'), // Si interaction_type = 'text_query'

    // Métadonnées flexibles (JSON)
    metadata: jsonb('metadata'),
    // Peut contenir: username, first_name, last_name, etc.

    // Horodatage
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Indexes pour optimiser les requêtes
    chatIdIdx: index('idx_conversations_chat_id').on(table.chatId),
    subscriberIdIdx: index('idx_conversations_subscriber_id').on(table.subscriberId),
    sessionIdIdx: index('idx_conversations_session_id').on(table.sessionId),
    createdAtIdx: index('idx_conversations_created_at').on(table.createdAt),
    interactionTypeIdx: index('idx_conversations_interaction_type').on(table.interactionType),
  })
);
