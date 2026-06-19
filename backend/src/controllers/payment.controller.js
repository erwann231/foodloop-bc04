const { query } = require('../config/database');
const stripeService = require('../services/stripe.service');
const { emitOrderUpdate } = require('../services/socket.service');

/**
 * POST /api/payments/create-intent
 * Créer un PaymentIntent pour une commande
 */
const createPaymentIntent = async (req, res, next) => {
    try {
        const { order_id } = req.body;

        if (!order_id) {
            return res.status(400).json({ error: 'order_id requis' });
        }

        // Récupérer la commande
        const orderResult = await query(
            'SELECT * FROM orders WHERE id = $1 AND consumer_id = $2',
            [order_id, req.user.id]
        );

        const order = orderResult.rows[0];

        if (!order) {
            return res.status(404).json({ error: 'Commande introuvable' });
        }

        if (order.stripe_payment_intent_id) {
            return res.status(400).json({ error: 'Cette commande a déjà été payée' });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ error: 'Impossible de payer une commande annulée' });
        }

        // Convertir en centimes pour Stripe
        const amountInCents = Math.round(parseFloat(order.total_amount) * 100);
        const platformFeeInCents = Math.round(parseFloat(order.platform_fee) * 100);

        // Créer le PaymentIntent
        const paymentIntent = await stripeService.createPaymentIntent(
            amountInCents,
            'eur',
            {
                order_id: order.id,
                consumer_id: req.user.id,
            }
        );

        // Sauvegarder le PaymentIntent ID dans la commande
        await query(
            'UPDATE orders SET stripe_payment_intent_id = $1, updated_at = NOW() WHERE id = $2',
            [paymentIntent.id, order_id]
        );

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: amountInCents,
            platformFee: platformFeeInCents,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/payments/confirm
 * Confirmer le paiement côté serveur (après succès côté client)
 */
const confirmPayment = async (req, res, next) => {
    try {
        const { order_id, payment_intent_id } = req.body;

        if (!order_id || !payment_intent_id) {
            return res.status(400).json({ error: 'order_id et payment_intent_id requis' });
        }

        // Vérifier le statut du PaymentIntent auprès de Stripe
        const paymentIntent = await stripeService.getPaymentIntent(payment_intent_id);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: `Paiement non confirmé (statut: ${paymentIntent.status})` });
        }

        // Passer la commande en confirmed
        const result = await query(
            `UPDATE orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1 RETURNING *`,
            [order_id]
        );

        emitOrderUpdate(order_id, 'confirmed');

        res.json({ order: result.rows[0], message: 'Paiement confirmé' });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/payments/refund
 * Rembourser une commande
 */
const refundPayment = async (req, res, next) => {
    try {
        const { order_id } = req.body;

        const orderResult = await query(
            'SELECT * FROM orders WHERE id = $1',
            [order_id]
        );

        const order = orderResult.rows[0];

        if (!order) {
            return res.status(404).json({ error: 'Commande introuvable' });
        }

        if (order.status === 'cancelled') {
            return res.status(400).json({ error: 'Commande déjà annulée' });
        }

        if (!order.stripe_payment_intent_id) {
            return res.status(400).json({ error: 'Aucun paiement à rembourser' });
        }

        // Créer le remboursement Stripe
        const refund = await stripeService.createRefund(order.stripe_payment_intent_id);

        // Annuler la commande
        await query(
            `UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
            [order_id]
        );

        emitOrderUpdate(order_id, 'cancelled');

        res.json({ refund_id: refund.id, message: 'Remboursement effectué' });
    } catch (err) {
        next(err);
    }
};

module.exports = { createPaymentIntent, confirmPayment, refundPayment };