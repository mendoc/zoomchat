import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../shared/config/env.js';
import * as schema from './schema/index.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export function getPool() {
  return pool;
}

export async function closeDatabase() {
  await pool.end();
}
