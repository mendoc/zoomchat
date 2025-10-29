import { pgTable, serial, varchar, text, date, timestamp } from 'drizzle-orm/pg-core';

export const parutions = pgTable('parutions', {
  id: serial('id').primaryKey(),
  numero: varchar('numero', { length: 10 }).notNull().unique(),
  periode: text('periode'),
  pdfUrl: text('pdf_url'),
  telegramFileId: text('telegram_file_id'),
  dateParution: date('date_parution'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
