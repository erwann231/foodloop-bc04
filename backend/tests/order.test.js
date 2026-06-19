const request = require('supertest');
const { app, server } = require('../src/index');

// Mock de la base de données et du socket
jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    pool: {
        connect: jest.fn(),
        end: jest.fn(),
    },
}));

jest.mock('../src/services/socket.service', () => ({
    initSocket: jest.fn(),
    emitOrderUpdate: jest.fn(),
}));

const { query, pool } = require('../src/config/database');
const jwt = require('jsonwebtoken');

// Générer un token de test
const makeToken = (role = 'consumer', id = 'user-uuid-123') => {
    return jwt.sign({ id, email: 'test@test.com', role }, process.env.JWT_SECRET || 'test_secret');
};

// Mock d'un client de transaction
const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
};

afterAll(() => {});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────
// POST /api/orders
// ─────────────────────────────────────────────────
describe('POST /api/orders', () => {
    beforeEach(() => {
        pool.connect.mockResolvedValue(mockClient);
    });

    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/orders').send({ items: [] });
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role producteur', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p1', quantity: 1 }] });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 400 si panier vide', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/vide/i);
    });

    test('devrait retourner 400 si items manquant', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(res.status).toBe(400);
    });

    test('devrait retourner 400 si produit introuvable', async () => {
        const token = makeToken('consumer');
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [] }); // SELECT products — aucun résultat

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'uuid-inexistant', quantity: 1 }] });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/introuvable/i);
    });

    test('devrait retourner 400 si stock insuffisant', async () => {
        const token = makeToken('consumer');
        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates', price: '3.50', stock_quantity: 1, is_available: true, producer_id: 'prod-1' }] }); // produits

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p1', quantity: 5 }] }); // demande 5, stock = 1

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/stock insuffisant/i);
    });

    test('devrait créer une commande avec succès', async () => {
        const token = makeToken('consumer');

        mockClient.query
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates', price: '3.50', stock_quantity: 10, is_available: true, producer_id: 'prod-1' }] }) // produits
            .mockResolvedValueOnce({ rows: [{ id: 'order-123', consumer_id: 'user-uuid-123', total_amount: 7.00, platform_fee: 0.56, status: 'pending', qr_code: 'qr-abc', created_at: new Date() }] }) // INSERT order
            .mockResolvedValueOnce({ rows: [] }) // INSERT order_item
            .mockResolvedValueOnce({ rows: [] }) // UPDATE stock
            .mockResolvedValueOnce({ rows: [] }); // COMMIT

        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p1', quantity: 2 }] });

        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('order');
        expect(res.body.order.id).toBe('order-123');
    });
});

// ─────────────────────────────────────────────────
// GET /api/orders/mine
// ─────────────────────────────────────────────────
describe('GET /api/orders/mine', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).get('/api/orders/mine');
        expect(res.status).toBe(401);
    });

    test('devrait retourner les commandes du consommateur', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({
            rows: [
                { id: 'order-1', status: 'confirmed', total_amount: 12.50, hub_name: 'Hub Paris 15', item_count: 2 },
                { id: 'order-2', status: 'completed', total_amount: 8.00, hub_name: 'Hub Lyon 7', item_count: 1 },
            ]
        });

        const res = await request(app)
            .get('/api/orders/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.orders).toHaveLength(2);
    });
});

// ─────────────────────────────────────────────────
// GET /api/orders/:id
// ─────────────────────────────────────────────────
describe('GET /api/orders/:id', () => {
    test('devrait retourner 404 si commande inexistante', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [] }); // commande non trouvée

        const res = await request(app)
            .get('/api/orders/uuid-inexistant')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    test('devrait retourner 403 si la commande appartient a un autre utilisateur', async () => {
        const token = makeToken('consumer', 'user-A');
        query.mockResolvedValueOnce({
            rows: [{ id: 'order-1', consumer_id: 'user-B', status: 'pending' }] // appartient à user-B
        });

        const res = await request(app)
            .get('/api/orders/order-1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    test('devrait retourner le détail de la commande si proprio', async () => {
        const token = makeToken('consumer', 'user-uuid-123');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'order-1', consumer_id: 'user-uuid-123', status: 'confirmed' }] })
            .mockResolvedValueOnce({ rows: [{ product_name: 'Tomates', quantity: 2, unit_price: 3.50 }] });

        const res = await request(app)
            .get('/api/orders/order-1')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.order.items).toHaveLength(1);
    });
});

// ─────────────────────────────────────────────────
// PATCH /api/orders/:id/status
// ─────────────────────────────────────────────────
describe('PATCH /api/orders/:id/status', () => {
    test('devrait retourner 403 si role consommateur', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .patch('/api/orders/order-1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'confirmed' });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 400 si statut invalide', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .patch('/api/orders/order-1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'statut_bidon' });
        expect(res.status).toBe(400);
    });

    test('devrait mettre à jour le statut avec succes', async () => {
        const token = makeToken('producer');
        query.mockResolvedValueOnce({
            rows: [{ id: 'order-1', status: 'confirmed', updated_at: new Date() }]
        });

        const res = await request(app)
            .patch('/api/orders/order-1/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'confirmed' });

        expect(res.status).toBe(200);
        expect(res.body.order.status).toBe('confirmed');
    });

    test('devrait retourner 404 si commande inexistante', async () => {
        const token = makeToken('admin');
        query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .patch('/api/orders/uuid-inexistant/status')
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'cancelled' });

        expect(res.status).toBe(404);
    });
});