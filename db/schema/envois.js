import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { parutions } from './parutions.js';
import { subscribers } from './subscribers.js';

export const envois = pgTable('envois', {
  id: serial('id').primaryKey(),
  parutionId: integer('parution_id').references(() => parutions.id, { onDelete: 'cascade' }),
  subscriberId: integer('subscriber_id').references(() => subscribers.id, { onDelete: 'cascade' }),
  statut: varchar('statut', { length: 20 }).notNull(),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
});
