import { getPool } from '../db/connection.js';
import { logger } from '../shared/logger.js';

/**
 * Script de migration manuelle pour créer les tables conversations et bot_responses
 */
async function migrate() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Creating conversations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id serial PRIMARY KEY NOT NULL,
        subscriber_id integer NOT NULL,
        chat_id bigint NOT NULL,
        session_id varchar(100) NOT NULL,
        interaction_type varchar(50) NOT NULL,
        message_id bigint,
        message_text text,
        command_name varchar(50),
        callback_data varchar(100),
        search_query text,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT conversations_subscriber_id_subscribers_id_fk
          FOREIGN KEY (subscriber_id)
          REFERENCES subscribers(id)
          ON DELETE CASCADE
      );
    `);

    logger.info('Creating indexes for conversations table...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_conversations_chat_id ON conversations (chat_id);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_conversations_subscriber_id ON conversations (subscriber_id);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations (session_id);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations (created_at);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_conversations_interaction_type ON conversations (interaction_type);'
    );

    logger.info('Creating bot_responses table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_responses (
        id serial PRIMARY KEY NOT NULL,
        conversation_id integer NOT NULL,
        chat_id bigint NOT NULL,
        response_message_id bigint,
        response_text text,
        response_type varchar(50) NOT NULL,
        search_results_count integer,
        metadata jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT bot_responses_conversation_id_conversations_id_fk
          FOREIGN KEY (conversation_id)
          REFERENCES conversations(id)
          ON DELETE CASCADE
      );
    `);

    logger.info('Creating indexes for bot_responses table...');
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bot_responses_conversation_id ON bot_responses (conversation_id);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bot_responses_chat_id ON bot_responses (chat_id);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bot_responses_created_at ON bot_responses (created_at);'
    );
    await client.query(
      'CREATE INDEX IF NOT EXISTS idx_bot_responses_response_type ON bot_responses (response_type);'
    );

    await client.query('COMMIT');
    logger.info('✓ Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Migration failed');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
