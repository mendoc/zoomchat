import { pgTable, serial, integer, text, timestamp, customType } from 'drizzle-orm/pg-core';
import { parutions } from './parutions.js';

const vector = customType({
  dataType() {
    return 'vector(1536)';
  },
});

export const annonces = pgTable('annonces', {
  id: serial('id').primaryKey(),
  parutionId: integer('parution_id')
    .references(() => parutions.id, { onDelete: 'cascade' })
    .notNull(),
  category: text('category'),
  subcategory: text('subcategory'),
  title: text('title'),
  reference: text('reference').unique(),
  description: text('description'),
  contact: text('contact'),
  price: text('price'),
  location: text('location'),
  embedding: vector('embedding'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
