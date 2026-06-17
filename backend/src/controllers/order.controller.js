const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { emitOrderUpdate } = require('../services/socket.service');

/**
 * POST /api/orders
 * Créer une commande depuis le panier
 *
 * Body attendu :
 * {
 *   hub_id: "uuid",
 *   items: [
 *     { product_id: "uuid", quantity: 2 },
 *     { product_id: "uuid", quantity: 1 }
 *   ],
 *   notes: "texte libre optionnel"
 * }
 */
const createOrder = async (req, res, next) => {
    const client = await require('../config/database').pool.connect();

    try {
        const { hub_id, items, notes } = req.body;
        const consumer_id = req.user.id;

        // Validation basique
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Le panier est vide' });
        }

        await client.query('BEGIN');

        // Récupérer les infos de chaque produit (prix, stock, producer_id)
        const productIds = items.map(i => i.product_id);
        const productsResult = await client.query(
            `SELECT p.id, p.name, p.price, p.stock_quantity, p.is_available, p.producer_id
       FROM products p
       WHERE p.id = ANY($1::uuid[])`,
            [productIds]
        );

        const products = productsResult.rows;

        // Vérifier que tous les produits existent et sont disponibles
        if (products.length !== items.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Un ou plusieurs produits sont introuvables' });
        }

        for (const product of products) {
            if (!product.is_available) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: `Le produit "${product.name}" n'est plus disponible` });
            }
        }

        // Vérifier les stocks et calculer le total
        let total_amount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = products.find(p => p.id === item.product_id);

            if (product.stock_quantity < item.quantity) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Stock insuffisant pour "${product.name}" (disponible : ${product.stock_quantity})`
                });
            }

            const subtotal = parseFloat(product.price) * item.quantity;
            total_amount += subtotal;

            orderItems.push({
                product_id: product.id,
                producer_id: product.producer_id,
                quantity: item.quantity,
                unit_price: parseFloat(product.price),
                subtotal,
            });
        }

        // Calculer la commission FoodLoop (8%)
        const platform_fee = parseFloat((total_amount * 0.08).toFixed(2));

        // Générer un QR code simple (UUID unique pour le retrait)
        const qr_code = uuidv4();

        // Créer la commande
        const orderResult = await client.query(
            `INSERT INTO orders (consumer_id, hub_id, total_amount, platform_fee, qr_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [consumer_id, hub_id || null, total_amount, platform_fee, qr_code, notes || null]
        );

        const order = orderResult.rows[0];

        // Insérer les lignes de commande
        for (const item of orderItems) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, producer_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [order.id, item.product_id, item.producer_id, item.quantity, item.unit_price, item.subtotal]
            );

            // Décrémenter le stock
            await client.query(
                `UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = NOW() WHERE id = $2`,
                [item.quantity, item.product_id]
            );
        }

        await client.query('COMMIT');

        // Émettre l'événement temps réel
        emitOrderUpdate(order.id, 'pending');

        res.status(201).json({
            order: {
                ...order,
                items: orderItems,
            }
        });

    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

/**
 * GET /api/orders/mine
 * Récupérer toutes les commandes du consommateur connecté
 */
const getMyOrders = async (req, res, next) => {
    try {
        const result = await query(
            `SELECT o.*,
              h.name as hub_name, h.address as hub_address,
              COUNT(oi.id) as item_count
       FROM orders o
       LEFT JOIN hubs h ON o.hub_id = h.id
       LEFT JOIN order_items oi ON o.id = oi.order_id
       WHERE o.consumer_id = $1
       GROUP BY o.id, h.name, h.address
       ORDER BY o.created_at DESC`,
            [req.user.id]
        );

        res.json({ orders: result.rows });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/orders/:id
 * Détail complet d'une commande avec ses lignes
 */
const getOrder = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Récupérer la commande
        const orderResult = await query(
            `SELECT o.*, h.name as hub_name, h.address as hub_address
       FROM orders o
       LEFT JOIN hubs h ON o.hub_id = h.id
       WHERE o.id = $1`,
            [id]
        );

        const order = orderResult.rows[0];

        if (!order) {
            return res.status(404).json({ error: 'Commande introuvable' });
        }

        // Vérifier les droits d'accès (proprio, producteur concerné ou admin)
        if (req.user.role === 'consumer' && order.consumer_id !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }

        // Récupérer les lignes de commande
        const itemsResult = await query(
            `SELECT oi.*, p.name as product_name, p.unit, p.images,
              pr.farm_name, u.first_name as producer_first_name, u.last_name as producer_last_name
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       JOIN producers pr ON oi.producer_id = pr.id
       JOIN users u ON pr.user_id = u.id
       WHERE oi.order_id = $1`,
            [id]
        );

        res.json({ order: { ...order, items: itemsResult.rows } });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/orders/:id/status
 * Mettre à jour le statut d'une commande
 * Réservé aux producteurs et admins
 *
 * Statuts possibles : pending → confirmed → preparing → ready → completed
 *                     (n'importe quel statut) → cancelled
 */
const updateOrderStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                error: `Statut invalide. Valeurs acceptées : ${validStatuses.join(', ')}`
            });
        }

        const result = await query(
            `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
            [status, id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Commande introuvable' });
        }

        // Notifier en temps réel via Socket.IO
        emitOrderUpdate(id, status);

        res.json({ order: result.rows[0] });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/orders/producer
 * Commandes du jour pour un producteur connecté
 */
const getProducerOrders = async (req, res, next) => {
    try {
        // Récupérer le profil producteur
        const producerResult = await query(
            'SELECT id FROM producers WHERE user_id = $1',
            [req.user.id]
        );

        if (!producerResult.rows[0]) {
            return res.status(403).json({ error: 'Profil producteur introuvable' });
        }

        const producer_id = producerResult.rows[0].id;

        const result = await query(
            `SELECT DISTINCT o.*, h.name as hub_name,
              u.first_name as consumer_first_name, u.last_name as consumer_last_name
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN hubs h ON o.hub_id = h.id
       JOIN users u ON o.consumer_id = u.id
       WHERE oi.producer_id = $1
         AND o.created_at::date = CURRENT_DATE
       ORDER BY o.created_at DESC`,
            [producer_id]
        );

        res.json({ orders: result.rows });
    } catch (err) {
        next(err);
    }
};

module.exports = { createOrder, getMyOrders, getOrder, updateOrderStatus, getProducerOrders };