import { logger } from '../shared/logger.js';

/**
 * Middleware de logging des requêtes HTTP
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} next - Fonction next d'Express
 */
export function loggerMiddleware(req, res, next) {
  const start = Date.now();

  // Logger la requête entrante
  logger.info(
    {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent')
    },
    'Requête HTTP reçue'
  );

  // Capturer la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info(
      {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration
      },
      'Requête HTTP terminée'
    );
  });

  next();
}
