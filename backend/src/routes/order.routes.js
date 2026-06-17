const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrder, updateOrderStatus, getProducerOrders } = require('../controllers/order.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /api/orders/mine — mes commandes (consommateur)
router.get('/mine', authenticate, authorize('consumer'), getMyOrders);

// GET /api/orders/producer — commandes du jour (producteur)
router.get('/producer', authenticate, authorize('producer'), getProducerOrders);

// GET /api/orders/:id — détail d'une commande
router.get('/:id', authenticate, getOrder);

// POST /api/orders — créer une commande
router.post('/', authenticate, authorize('consumer'), createOrder);

// PATCH /api/orders/:id/status — changer le statut
router.patch('/:id/status', authenticate, authorize('producer', 'admin'), updateOrderStatus);

module.exports = router;