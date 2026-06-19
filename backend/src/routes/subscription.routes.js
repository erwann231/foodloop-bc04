const express = require('express');
const router = express.Router();
const { createSubscription, getMySubscriptions, toggleSubscription, deleteSubscription, getProducerSubscriptionCount } = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// POST /api/subscriptions — créer un abonnement
router.post('/', authenticate, authorize('consumer'), createSubscription);

// GET /api/subscriptions/mine — mes abonnements
router.get('/mine', authenticate, authorize('consumer'), getMySubscriptions);

// GET /api/subscriptions/producer-count — nombre d'abonnés actifs (producteur)
router.get('/producer-count', authenticate, authorize('producer'), getProducerSubscriptionCount);

// PATCH /api/subscriptions/:id/toggle — activer/désactiver
router.patch('/:id/toggle', authenticate, authorize('consumer'), toggleSubscription);

// DELETE /api/subscriptions/:id — supprimer
router.delete('/:id', authenticate, authorize('consumer'), deleteSubscription);

module.exports = router;