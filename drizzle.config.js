import 'dotenv/config';

export default {
  schema: './db/schema/*.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
};
