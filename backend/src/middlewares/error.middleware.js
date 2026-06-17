/**
 * Middleware de gestion centralisée des erreurs
 * Toujours déclarer en dernier dans app.use()
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Erreur :`, err.message);

  // Erreur de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token invalide' });
  }

  // Erreur PostgreSQL — contrainte unique
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Cette ressource existe déjà' });
  }

  // Erreur PostgreSQL — clé étrangère invalide
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Référence invalide' });
  }

  // Erreur générique
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Une erreur interne est survenue'
    : err.message;

  res.status(status).json({ error: message });
};

module.exports = { errorHandler };
