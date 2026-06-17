const { query } = require('../config/database');

/**
 * GET /api/products
 * Liste des produits avec filtres (ville, catégorie, rayon, labels)
 */
const getProducts = async (req, res, next) => {
  try {
    const { city, category, label, search, limit = 20, offset = 0 } = req.query;

    let sql = `
      SELECT p.*, 
             pr.farm_name, pr.city as producer_city, pr.latitude, pr.longitude, pr.labels as producer_labels,
             u.first_name as producer_first_name, u.last_name as producer_last_name
      FROM products p
      JOIN producers pr ON p.producer_id = pr.id
      JOIN users u ON pr.user_id = u.id
      WHERE p.is_available = true AND pr.is_verified = true
    `;
    const params = [];
    let paramIdx = 1;

    if (city) {
      sql += ` AND pr.city ILIKE $${paramIdx++}`;
      params.push(`%${city}%`);
    }

    if (category) {
      sql += ` AND p.category = $${paramIdx++}`;
      params.push(category);
    }

    if (label) {
      sql += ` AND $${paramIdx++} = ANY(p.labels)`;
      params.push(label);
    }

    if (search) {
      sql += ` AND (p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);
    res.json({ products: result.rows, count: result.rowCount });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/products/:id
 * Détail d'un produit
 */
const getProduct = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, pr.farm_name, pr.city as producer_city, pr.description as producer_description,
              u.first_name, u.last_name
       FROM products p
       JOIN producers pr ON p.producer_id = pr.id
       JOIN users u ON pr.user_id = u.id
       WHERE p.id = $1`,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/products
 * Créer un produit (producteur connecté uniquement)
 */
const createProduct = async (req, res, next) => {
  try {
    const { name, description, price, unit, stock_quantity, category, images, labels } = req.body;

    if (!name || !price || !unit) {
      return res.status(400).json({ error: 'Nom, prix et unité sont obligatoires' });
    }

    // Récupérer le profil producteur de l'utilisateur connecté
    const producerResult = await query(
      'SELECT id FROM producers WHERE user_id = $1',
      [req.user.id]
    );

    if (!producerResult.rows[0]) {
      return res.status(403).json({ error: 'Profil producteur introuvable' });
    }

    const producer_id = producerResult.rows[0].id;

    const result = await query(
      `INSERT INTO products (producer_id, name, description, price, unit, stock_quantity, category, images, labels)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [producer_id, name, description, parseFloat(price), unit, stock_quantity || 0, category, images || [], labels || []]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/products/:id
 * Modifier un produit (propriétaire uniquement)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { name, description, price, unit, stock_quantity, category, images, labels, is_available } = req.body;

    // Vérifier que le produit appartient au producteur connecté
    const check = await query(
      `SELECT p.id FROM products p
       JOIN producers pr ON p.producer_id = pr.id
       WHERE p.id = $1 AND pr.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!check.rows[0]) {
      return res.status(403).json({ error: 'Accès refusé ou produit introuvable' });
    }

    const result = await query(
      `UPDATE products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           unit = COALESCE($4, unit),
           stock_quantity = COALESCE($5, stock_quantity),
           category = COALESCE($6, category),
           images = COALESCE($7, images),
           labels = COALESCE($8, labels),
           is_available = COALESCE($9, is_available),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, description, price, unit, stock_quantity, category, images, labels, is_available, req.params.id]
    );

    res.json({ product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/products/:id
 */
const deleteProduct = async (req, res, next) => {
  try {
    const check = await query(
      `SELECT p.id FROM products p
       JOIN producers pr ON p.producer_id = pr.id
       WHERE p.id = $1 AND pr.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!check.rows[0]) {
      return res.status(403).json({ error: 'Accès refusé ou produit introuvable' });
    }

    await query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ message: 'Produit supprimé' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
