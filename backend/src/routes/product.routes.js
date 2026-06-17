const express = require('express');
const router = express.Router();
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct } = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /api/products — public
router.get('/', getProducts);

// GET /api/products/:id — public
router.get('/:id', getProduct);

// POST /api/products — producteurs uniquement
router.post('/', authenticate, authorize('producer'), createProduct);

// PUT /api/products/:id — producteurs uniquement
router.put('/:id', authenticate, authorize('producer'), updateProduct);

// DELETE /api/products/:id — producteurs uniquement
router.delete('/:id', authenticate, authorize('producer'), deleteProduct);

module.exports = router;
