const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'foodloop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // En production (Render), utiliser DATABASE_URL directement
  ...(process.env.DATABASE_URL && {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
});

pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL :', err.message);
});

/**
 * Exécuter une requête SQL
 * @param {string} text - La requête SQL
 * @param {Array} params - Les paramètres de la requête
 */
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
