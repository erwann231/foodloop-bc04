const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Créer un PaymentIntent Stripe
 * @param {number} amount - Montant en centimes
 * @param {string} currency - Devise (eur par défaut)
 * @param {object} metadata - Métadonnées
 */
const createPaymentIntent = async (amount, currency = 'eur', metadata = {}) => {
    return await stripe.paymentIntents.create({
        amount,
        currency,
        metadata,
        automatic_payment_methods: { enabled: true },
    });
};

/**
 * Récupérer un PaymentIntent
 * @param {string} paymentIntentId
 */
const getPaymentIntent = async (paymentIntentId) => {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
};

/**
 * Rembourser un paiement
 * @param {string} paymentIntentId
 */
const createRefund = async (paymentIntentId) => {
    return await stripe.refunds.create({ payment_intent: paymentIntentId });
};

/**
 * Construire un événement webhook Stripe
 */
const constructWebhookEvent = (payload, signature) => {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
};

module.exports = { createPaymentIntent, getPaymentIntent, createRefund, constructWebhookEvent };