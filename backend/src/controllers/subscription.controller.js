// subscription.controller.js
// Membre 2 — Contrôleur abonnement hebdomadaire (F08)

const subscriptionService = require('../services/subscription.service');

async function create(req, res) {
  try {
    const result = await subscriptionService.createSubscription(req.user.id, req.body);
    return res.status(201).json(result);
  } catch (err) {
    console.error('[createSubscription]', err);
    const status = err.message.includes('moyen de paiement') ? 400 : 500;
    return res.status(status).json({ error: err.message });
  }
}

async function getMine(req, res) {
  try {
    const db = require('../db');
    const subs = await db.query(
      `SELECT s.*, json_agg(json_build_object(
         'product_id', si.product_id,
         'quantity', si.quantity,
         'unit_price', si.unit_price
       )) AS items
       FROM subscriptions s
       JOIN subscription_items si ON si.subscription_id = s.id
       WHERE s.consumer_id = $1 AND s.status != 'cancelled'
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ subscriptions: subs.rows });
  } catch (err) {
    console.error('[getMineSubscriptions]', err);
    return res.status(500).json({ error: 'Erreur récupération abonnements' });
  }
}

async function update(req, res) {
  try {
    const result = await subscriptionService.updateSubscription(req.user.id, req.params.id, req.body);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[updateSubscription]', err);
    const status = err.message.includes('introuvable') ? 404 : 400;
    return res.status(status).json({ error: err.message });
  }
}

async function cancel(req, res) {
  try {
    const result = await subscriptionService.cancelSubscription(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[cancelSubscription]', err);
    return res.status(404).json({ error: err.message });
  }
}

module.exports = { create, getMine, update, cancel };
