const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// TODO (Personne B) : importer le controller order
// const { createOrder, getOrders, getOrder, updateOrderStatus } = require('../controllers/order.controller');

// POST /api/orders — consommateur connecté
router.post('/', authenticate, authorize('consumer'), (req, res) => {
  res.status(501).json({ message: 'À implémenter — voir order.controller.js' });
});

// GET /api/orders/mine — mes commandes
router.get('/mine', authenticate, (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

// GET /api/orders/:id — détail commande
router.get('/:id', authenticate, (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

// PATCH /api/orders/:id/status — producteur ou admin
router.patch('/:id/status', authenticate, authorize('producer', 'admin'), (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

module.exports = router;
