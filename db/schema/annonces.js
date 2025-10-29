import { pgTable, serial, integer, text, timestamp, index, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { parutions } from './parutions.js';

const vector = customType({
  dataType() {
    return 'vector(1536)';
  },
});

const tsvector = customType({
  dataType() {
    return 'tsvector';
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
  searchVector: tsvector('search_vector').$default(() => sql`to_tsvector('french', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') || ' ' || coalesce(location, ''))`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  searchVectorIdx: index('idx_annonces_search_vector').on(table.searchVector),
}));
