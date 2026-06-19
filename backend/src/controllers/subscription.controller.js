const { query } = require('../config/database');

/**
 * POST /api/subscriptions
 * Créer un abonnement panier hebdomadaire
 */
const createSubscription = async (req, res, next) => {
    try {
        const { items, hub_id } = req.body;
        const consumer_id = req.user.id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Le panier d\'abonnement est vide' });
        }

        // Vérifier que les produits existent
        const productIds = items.map(i => i.product_id);
        const productsResult = await query(
            'SELECT id, name, price FROM products WHERE id = ANY($1::uuid[]) AND is_available = true',
            [productIds]
        );

        if (productsResult.rows.length !== items.length) {
            return res.status(400).json({ error: 'Un ou plusieurs produits sont introuvables ou indisponibles' });
        }

        // Calculer la prochaine date de commande (prochain lundi)
        const nextMonday = new Date();
        nextMonday.setDate(nextMonday.getDate() + ((8 - nextMonday.getDay()) % 7 || 7));
        const next_order_date = nextMonday.toISOString().split('T')[0];

        const result = await query(
            `INSERT INTO subscriptions (consumer_id, hub_id, items, is_active, next_order_date)
             VALUES ($1, $2, $3, true, $4)
                 RETURNING *`,
            [consumer_id, hub_id || null, JSON.stringify(items), next_order_date]
        );

        res.status(201).json({
            subscription_id: result.rows[0].id,
            status: 'active',
            next_billing_date: next_order_date,
            items: items,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/subscriptions/mine
 * Récupérer les abonnements du consommateur connecté
 */
const getMySubscriptions = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT s.*, h.name as hub_name
             FROM subscriptions s
                      LEFT JOIN hubs h ON s.hub_id = h.id
             WHERE s.consumer_id = $1
             ORDER BY s.created_at DESC`,
            [req.user.id]
        );

        // Enrichir avec les noms des produits
        const subscriptions = await Promise.all(result.rows.map(async (sub) => {
            const items = sub.items;
            const productIds = items.map(i => i.product_id);

            const productsResult = await query(
                'SELECT id, name, price, unit FROM products WHERE id = ANY($1::uuid[])',
                [productIds]
            );

            const enrichedItems = items.map(item => {
                const product = productsResult.rows.find(p => p.id === item.product_id);
                return { ...item, product_name: product?.name, unit: product?.unit, price: product?.price };
            });

            return { ...sub, items: enrichedItems };
        }));

        res.json({ subscriptions });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/subscriptions/:id/toggle
 * Activer ou désactiver un abonnement
 */
const toggleSubscription = async (req, res, next) => {
    try {
        const { id } = req.params;

        const check = await query(
            'SELECT * FROM subscriptions WHERE id = $1 AND consumer_id = $2',
            [id, req.user.id]
        );

        if (!check.rows[0]) {
            return res.status(404).json({ error: 'Abonnement introuvable' });
        }

        const newStatus = !check.rows[0].is_active;

        const result = await query(
            'UPDATE subscriptions SET is_active = $1 WHERE id = $2 RETURNING *',
            [newStatus, id]
        );

        res.json({
            subscription: result.rows[0],
            message: newStatus ? 'Abonnement réactivé' : 'Abonnement suspendu',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/subscriptions/:id
 * Supprimer un abonnement
 */
const deleteSubscription = async (req, res, next) => {
    try {
        const { id } = req.params;

        const check = await query(
            'SELECT id FROM subscriptions WHERE id = $1 AND consumer_id = $2',
            [id, req.user.id]
        );

        if (!check.rows[0]) {
            return res.status(404).json({ error: 'Abonnement introuvable' });
        }

        await query('DELETE FROM subscriptions WHERE id = $1', [id]);
        res.json({ message: 'Abonnement supprimé' });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/subscriptions/producer-count
 * Nombre d'abonnements actifs contenant les produits du producteur
 */
const getProducerSubscriptionCount = async (req, res, next) => {
    try {
        const producerResult = await query(
            'SELECT id FROM producers WHERE user_id = $1',
            [req.user.id]
        );

        if (!producerResult.rows[0]) {
            return res.status(403).json({ error: 'Profil producteur introuvable' });
        }

        const producer_id = producerResult.rows[0].id;

        // Chercher les abonnements actifs qui contiennent des produits de ce producteur
        const result = await query(
            `SELECT COUNT(DISTINCT s.id) as count
       FROM subscriptions s
       JOIN products p ON p.id::text = ANY(
         SELECT jsonb_array_elements(s.items)->>'product_id'
       )
       WHERE s.is_active = true AND p.producer_id = $1`,
            [producer_id]
        );

        res.json({ count: parseInt(result.rows[0].count) });
    } catch (err) {
        next(err);
    }
};

module.exports = { createSubscription, getMySubscriptions, toggleSubscription, deleteSubscription, getProducerSubscriptionCount };