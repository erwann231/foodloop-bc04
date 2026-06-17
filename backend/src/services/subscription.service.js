// subscription.service.js
// Membre 2 — Abonnement panier hebdomadaire (F08)
// Logique : créer, modifier, annuler un abonnement + job de débit hebdomadaire

const stripeService = require('./stripe.service');
const db = require('../config/database');

// ─────────────────────────────────────────────
// Créer un abonnement hebdomadaire
// Body : { items: [{product_id, quantity}], hub_id, delivery_day: 'monday'|..., notes? }
// ─────────────────────────────────────────────
async function createSubscription(userId, { items, hub_id, delivery_day, notes }) {
  // Vérifier que le consumer a bien sauvegardé une CB (setup intent complété)
  const consumer = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!consumer.rows[0].stripe_customer_id) {
    throw new Error('Vous devez enregistrer un moyen de paiement avant de souscrire');
  }

  // Calculer le montant total de l'abonnement
  const productIds = items.map((i) => i.product_id);
  const products = await db.query(
    'SELECT id, price, producer_id FROM products WHERE id = ANY($1)',
    [productIds]
  );

  let totalAmount = 0;
  const itemsWithPrice = items.map((item) => {
    const product = products.rows.find((p) => p.id === item.product_id);
    if (!product) throw new Error(`Produit ${item.product_id} introuvable`);
    const lineTotal = product.price * item.quantity;
    totalAmount += lineTotal;
    return { ...item, unit_price: product.price, producer_id: product.producer_id };
  });

  // Insérer l'abonnement en BDD
  const sub = await db.query(
    `INSERT INTO subscriptions (consumer_id, hub_id, delivery_day, notes, total_amount, status, next_billing_date, created_at)
     VALUES ($1, $2, $3, $4, $5, 'active', NOW() + INTERVAL '7 days', NOW())
     RETURNING id`,
    [userId, hub_id, delivery_day, notes, totalAmount]
  );

  const subscriptionId = sub.rows[0].id;

  // Insérer les lignes de l'abonnement
  for (const item of itemsWithPrice) {
    await db.query(
      `INSERT INTO subscription_items (subscription_id, product_id, quantity, unit_price, producer_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [subscriptionId, item.product_id, item.quantity, item.unit_price, item.producer_id]
    );
  }

  return {
    subscription_id: subscriptionId,
    total_amount: totalAmount,
    next_billing_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  };
}

// ─────────────────────────────────────────────
// Modifier un abonnement (changer les produits ou le hub)
// ─────────────────────────────────────────────
async function updateSubscription(userId, subscriptionId, { items, hub_id, delivery_day, notes }) {
  const sub = await db.query(
    'SELECT * FROM subscriptions WHERE id = $1 AND consumer_id = $2',
    [subscriptionId, userId]
  );

  if (!sub.rows[0]) throw new Error('Abonnement introuvable');
  if (sub.rows[0].status === 'cancelled') throw new Error('Abonnement annulé, impossible de modifier');

  // Recalculer le montant total
  const productIds = items.map((i) => i.product_id);
  const products = await db.query(
    'SELECT id, price, producer_id FROM products WHERE id = ANY($1)',
    [productIds]
  );

  let totalAmount = 0;
  const itemsWithPrice = items.map((item) => {
    const product = products.rows.find((p) => p.id === item.product_id);
    if (!product) throw new Error(`Produit ${item.product_id} introuvable`);
    totalAmount += product.price * item.quantity;
    return { ...item, unit_price: product.price, producer_id: product.producer_id };
  });

  // MAJ de l'abonnement
  await db.query(
    `UPDATE subscriptions SET hub_id = $1, delivery_day = $2, notes = $3, total_amount = $4
     WHERE id = $5`,
    [hub_id, delivery_day, notes, totalAmount, subscriptionId]
  );

  // Remplacer les items
  await db.query('DELETE FROM subscription_items WHERE subscription_id = $1', [subscriptionId]);
  for (const item of itemsWithPrice) {
    await db.query(
      `INSERT INTO subscription_items (subscription_id, product_id, quantity, unit_price, producer_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [subscriptionId, item.product_id, item.quantity, item.unit_price, item.producer_id]
    );
  }

  return { subscription_id: subscriptionId, total_amount: totalAmount };
}

// ─────────────────────────────────────────────
// Annuler un abonnement
// ─────────────────────────────────────────────
async function cancelSubscription(userId, subscriptionId) {
  const result = await db.query(
    `UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW()
     WHERE id = $1 AND consumer_id = $2
     RETURNING id`,
    [subscriptionId, userId]
  );

  if (!result.rows[0]) throw new Error('Abonnement introuvable');

  return { subscription_id: subscriptionId, status: 'cancelled' };
}

// ─────────────────────────────────────────────
// Job hebdomadaire : débiter tous les abonnements actifs dus
// À appeler avec node-cron tous les jours à 8h00 (voir app.js)
//   cron.schedule('0 8 * * *', () => subscriptionService.processWeeklyBillings())
// ─────────────────────────────────────────────
async function processWeeklyBillings() {
  console.log('[Subscription] Début du traitement des débits hebdomadaires');

  // Tous les abonnements actifs dont la prochaine facturation est aujourd'hui
  const subs = await db.query(
    `SELECT s.*, u.stripe_customer_id, u.email
     FROM subscriptions s
     JOIN users u ON s.consumer_id = u.id
     WHERE s.status = 'active'
     AND s.next_billing_date::date <= NOW()::date`
  );

  let successCount = 0;
  let failCount = 0;

  for (const sub of subs.rows) {
    try {
      // Récupérer les items et le compte Stripe du producteur
      const items = await db.query(
        `SELECT si.*, p.stripe_account_id
         FROM subscription_items si
         JOIN products p ON si.product_id = p.id
         WHERE si.subscription_id = $1`,
        [sub.id]
      );

      // Pour simplifier : on prend le premier producteur (marketplace mono-producteur)
      // En multi-producteur : il faudrait créer un PaymentIntent par producteur
      const producerAccountId = items.rows[0]?.stripe_account_id;

      if (!producerAccountId) {
        console.error(`[Subscription] Pas de compte Stripe producteur pour abonnement ${sub.id}`);
        failCount++;
        continue;
      }

      const amountInCents = Math.round(sub.total_amount * 100);

      // Débiter la CB sauvegardée
      await stripeService.chargeSubscriptionBasket({
        stripeCustomerId: sub.stripe_customer_id,
        amount: amountInCents,
        producerAccountId,
        subscriptionId: sub.id,
      });

      // Créer automatiquement une commande pour cette semaine
      const order = await db.query(
        `INSERT INTO orders (consumer_id, hub_id, notes, total_amount, platform_fee, status, subscription_id, created_at)
         VALUES ($1, $2, $3, $4, $5, 'confirmed', $6, NOW())
         RETURNING id`,
        [
          sub.consumer_id,
          sub.hub_id,
          sub.notes,
          sub.total_amount,
          Math.round(sub.total_amount * 0.08),
          sub.id,
        ]
      );

      // Insérer les items de la commande
      for (const item of items.rows) {
        await db.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [order.rows[0].id, item.product_id, item.quantity, item.unit_price]
        );
      }

      // Mettre à jour la prochaine date de facturation
      await db.query(
        `UPDATE subscriptions SET next_billing_date = NOW() + INTERVAL '7 days', last_billed_at = NOW()
         WHERE id = $1`,
        [sub.id]
      );

      successCount++;
      console.log(`[Subscription] ✅ Abonnement ${sub.id} débité — commande ${order.rows[0].id} créée`);

    } catch (err) {
      failCount++;
      console.error(`[Subscription] ❌ Échec débit abonnement ${sub.id} :`, err.message);

      // Marquer l'abonnement en erreur de paiement
      await db.query(
        `UPDATE subscriptions SET status = 'payment_failed', payment_failed_at = NOW() WHERE id = $1`,
        [sub.id]
      );
    }
  }

  console.log(`[Subscription] Traitement terminé — ${successCount} succès, ${failCount} échecs`);
}

module.exports = {
  createSubscription,
  updateSubscription,
  cancelSubscription,
  processWeeklyBillings,
};
