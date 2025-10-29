export const PDF_CONFIG = {
  PAGES_TO_EXTRACT: [1, 3, 5, 6, 7],
  MIME_TYPE: 'application/pdf',
};

export const GEMINI_CONFIG = {
  MODEL_NAME: 'gemini-2.0-flash-exp',
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 3000, 10000],
  RATE_LIMIT_DELAY: 500,
};

export const EMBEDDING_CONFIG = {
  MODEL_NAME: 'gemini-embedding-001',
  DIMENSIONS: 1536, // Slicé depuis 3072 (Matryoshka Representation Learning)
  ORIGINAL_DIMENSIONS: 3072,
  RATE_LIMIT_DELAY: 50,
  TASK_TYPE: 'RETRIEVAL_DOCUMENT',
};

export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 10,
  DEFAULT_MIN_SCORE: 0.3,
};

export const NOTIFICATION_CONFIG = {
  DELAY_BETWEEN_SENDS: 50,
  MAX_CAPTION_LENGTH: 1024,
};

export const TELEGRAM_CONFIG = {
  MAX_MESSAGE_LENGTH: 4096,
  MAX_QUERY_LENGTH: 500,
};
