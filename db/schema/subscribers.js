import { pgTable, serial, bigint, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  chatId: bigint('chat_id', { mode: 'number' }).notNull().unique(),
  nom: text('nom').notNull(),
  telephone: text('telephone'),
  dateAbonnement: timestamp('date_abonnement', { withTimezone: true }).defaultNow(),
  actif: boolean('actif').default(true).notNull(),
});
