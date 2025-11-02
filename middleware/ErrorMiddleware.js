import { logger } from '../shared/logger.js';
import { AppError, ValidationError, NotFoundError } from '../shared/errors.js';

/**
 * Middleware de gestion centralisée des erreurs
 * @param {Error} err - Erreur capturée
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {Function} _next - Fonction next d'Express (non utilisée)
 */
export function errorMiddleware(err, req, res, _next) {
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      body: req.body,
      headers: req.headers,
    },
    'Erreur HTTP interceptée'
  );

  // Erreurs custom (AppError, ValidationError, NotFoundError)
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: err.message,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message,
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    details: err.message,
  });
}
