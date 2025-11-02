export const apiMessages = {
  health: {
    ok: { status: 'ok', message: 'ZoomChat API is running' },
  },

  webhook: {
    success: { success: true, message: 'Webhook configuré avec succès' },
    error: (error) => ({ success: false, error: error.message }),
  },

  extract: {
    noParution: { success: false, error: 'Aucune parution trouvée avec ce numéro' },
    success: (numero, totalAnnonces) => ({
      success: true,
      message: 'Extraction terminée avec succès',
      parutionNumero: numero,
      totalAnnonces,
    }),
    error: (error) => ({ success: false, error: error.message }),
  },

  search: {
    missingQuery: { error: 'Le paramètre "query" est requis' },
    success: (results, query) => ({
      success: true,
      query,
      count: results.length,
      results,
    }),
    error: (error) => ({ error: error.message }),
  },

  notFound: { error: 'Not Found' },

  serverError: (error) => ({ error: 'Internal Server Error', details: error.message }),
};
