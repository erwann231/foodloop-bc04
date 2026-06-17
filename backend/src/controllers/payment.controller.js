// payment.controller.js
// Membre 2 — Routes paiement + webhook Stripe

const stripeService = require('../services/stripe.service');
const socketService = require('../services/socket.service');
// Remplace par ton ORM réel (ex: prisma, knex, pg)
const db = require('../config/database');

// ─────────────────────────────────────────────
// POST /api/payments/create-intent
// Body : { order_id }
// Auth : consumer
// ─────────────────────────────────────────────
async function createPaymentIntent(req, res) {
  try {
    const { order_id } = req.body;
    const userId = req.user.id;

    // 1. Récupérer la commande
    const order = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND consumer_id = $2',
      [order_id, userId]
    );

    if (!order.rows[0]) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const orderData = order.rows[0];

    if (orderData.status !== 'pending') {
      return res.status(400).json({ error: 'Cette commande a déjà été payée ou annulée' });
    }

    // 2. Récupérer le compte Stripe Connect du producteur
    const producer = await db.query(
      `SELECT u.stripe_account_id 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id
       JOIN users u ON p.producer_id = u.id
       WHERE oi.order_id = $1
       LIMIT 1`,
      [order_id]
    );

    if (!producer.rows[0]?.stripe_account_id) {
      return res.status(400).json({ error: 'Le producteur n\'a pas encore configuré son compte de paiement' });
    }

    // 3. Récupérer ou créer le customer Stripe du consommateur
    const consumerData = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const consumer = consumerData.rows[0];

    let stripeCustomerId = consumer.stripe_customer_id;
    if (!stripeCustomerId) {
      stripeCustomerId = await stripeService.getOrCreateCustomer({
        email: consumer.email,
        userId: consumer.id,
        name: `${consumer.first_name} ${consumer.last_name}`,
      });
      // Sauvegarder l'ID customer pour la prochaine fois
      await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, userId]);
    }

    // 4. Montant en centimes (total_amount est en euros dans la BDD)
    const amountInCents = Math.round(orderData.total_amount * 100);

    // 5. Créer le PaymentIntent
    const result = await stripeService.createPaymentIntent({
      amount: amountInCents,
      producerAccountId: producer.rows[0].stripe_account_id,
      orderId: order_id,
      customerId: stripeCustomerId,
    });

    // 6. Sauvegarder le payment_intent_id sur la commande
    await db.query(
      'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
      [result.paymentIntentId, order_id]
    );

    return res.status(200).json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: amountInCents,
      platformFee: result.platformFee,
    });

  } catch (err) {
    console.error('[createPaymentIntent]', err);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
}

// ─────────────────────────────────────────────
// POST /api/payments/webhook
// Reçoit les événements Stripe (stripe-signature dans les headers)
// ⚠️  Ce endpoint doit recevoir le raw body (avant JSON.parse) — voir app.js
// ─────────────────────────────────────────────
async function handleWebhook(req, res) {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.rawBody, signature);
  } catch (err) {
    console.error('[Webhook] Signature invalide :', err.message);
    return res.status(400).json({ error: 'Signature webhook invalide' });
  }

  try {
    switch (event.type) {

      // Paiement réussi → confirmer la commande
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          await db.query(
            `UPDATE orders SET status = 'confirmed', paid_at = NOW() WHERE stripe_payment_intent_id = $1`,
            [paymentIntent.id]
          );

          // Émettre l'événement Socket.IO pour le temps réel
          socketService.emitOrderUpdate(orderId, 'confirmed');

          console.log(`[Webhook] Commande ${orderId} confirmée après paiement`);
        }
        break;
      }

      // Paiement échoué
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata.order_id;

        if (orderId) {
          await db.query(
            `UPDATE orders SET status = 'cancelled' WHERE stripe_payment_intent_id = $1`,
            [paymentIntent.id]
          );

          socketService.emitOrderUpdate(orderId, 'cancelled');
          console.log(`[Webhook] Paiement échoué pour la commande ${orderId}`);
        }
        break;
      }

      // Abonnement hebdomadaire : paiement réussi
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        if (paymentIntent.metadata.type === 'weekly_basket') {
          const subscriptionId = paymentIntent.metadata.subscription_id;
          await db.query(
            `UPDATE subscriptions SET last_billed_at = NOW(), next_billing_date = NOW() + INTERVAL '7 days'
             WHERE id = $1`,
            [subscriptionId]
          );
        }
        break;
      }

      default:
        console.log(`[Webhook] Événement ignoré : ${event.type}`);
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('[Webhook] Erreur traitement :', err);
    return res.status(500).json({ error: 'Erreur traitement webhook' });
  }
}

// ─────────────────────────────────────────────
// POST /api/payments/refund
// Body : { order_id, amount? (en centimes, optionnel) }
// Auth : producer ou admin
// ─────────────────────────────────────────────
async function refundOrder(req, res) {
  try {
    const { order_id, amount } = req.body;

    const order = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [order_id]
    );

    if (!order.rows[0]) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const { stripe_payment_intent_id, status } = order.rows[0];

    if (!stripe_payment_intent_id) {
      return res.status(400).json({ error: 'Aucun paiement associé à cette commande' });
    }

    if (status === 'cancelled') {
      return res.status(400).json({ error: 'Commande déjà annulée' });
    }

    const refund = await stripeService.refundPayment(stripe_payment_intent_id, { amount });

    await db.query(
      `UPDATE orders SET status = 'cancelled', refunded_at = NOW() WHERE id = $1`,
      [order_id]
    );

    socketService.emitOrderUpdate(order_id, 'cancelled');

    return res.status(200).json({ refund_id: refund.id, status: refund.status });

  } catch (err) {
    console.error('[refundOrder]', err);
    return res.status(500).json({ error: 'Erreur lors du remboursement' });
  }
}

// ─────────────────────────────────────────────
// POST /api/payments/setup-intent
// Sauvegarde la CB pour l'abonnement hebdomadaire (F08)
// Auth : consumer
// ─────────────────────────────────────────────
async function createSetupIntent(req, res) {
  try {
    const userId = req.user.id;

    const consumerData = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
    const consumer = consumerData.rows[0];

    let stripeCustomerId = consumer.stripe_customer_id;
    if (!stripeCustomerId) {
      stripeCustomerId = await stripeService.getOrCreateCustomer({
        email: consumer.email,
        userId: consumer.id,
        name: `${consumer.first_name} ${consumer.last_name}`,
      });
      await db.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [stripeCustomerId, userId]);
    }

    const result = await stripeService.createSetupIntent(stripeCustomerId);

    return res.status(200).json(result);

  } catch (err) {
    console.error('[createSetupIntent]', err);
    return res.status(500).json({ error: 'Erreur création setup intent' });
  }
}

module.exports = {
  createPaymentIntent,
  handleWebhook,
  refundOrder,
  createSetupIntent,
};
