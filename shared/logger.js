/**
 * Logger wrapper - uses native console
 * Replaces Pino for simplicity
 * Handles Pino-style object logging: logger.info({ foo: 'bar' }, 'message')
 */

/**
 * Helper to format Pino-style logs
 * @param {any[]} args - Arguments passed to logger
 * @returns {any[]} - Formatted arguments for console
 */
function formatArgs(args) {
  // If first arg is an object and second is a string (Pino pattern)
  if (args.length >= 2 && typeof args[0] === 'object' && args[0] !== null && typeof args[1] === 'string') {
    const [obj, message, ...rest] = args;
    return [message, obj, ...rest];
  }
  return args;
}

export const logger = {
  info: (...args) => console.log(...formatArgs(args)),
  error: (...args) => console.error(...formatArgs(args)),
  warn: (...args) => console.warn(...formatArgs(args)),
  debug: (...args) => console.debug(...formatArgs(args)),
};
