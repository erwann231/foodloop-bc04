const express = require('express');
const router = express.Router();
const { createPaymentIntent, confirmPayment, refundPayment } = require('../controllers/payment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// POST /api/payments/create-intent — créer un PaymentIntent (consommateur)
router.post('/create-intent', authenticate, authorize('consumer'), createPaymentIntent);

// POST /api/payments/confirm — confirmer le paiement (consommateur)
router.post('/confirm', authenticate, authorize('consumer'), confirmPayment);

// POST /api/payments/refund — rembourser (admin uniquement)
router.post('/refund', authenticate, authorize('admin'), refundPayment);

module.exports = router;