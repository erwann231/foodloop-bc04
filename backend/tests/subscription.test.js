const request = require('supertest');
const { app, server } = require('../src/index');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    pool: { connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../src/services/socket.service', () => ({
    initSocket: jest.fn(),
    emitOrderUpdate: jest.fn(),
}));

jest.mock('../src/services/stripe.service', () => ({
    createPaymentIntent: jest.fn(),
    getPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    constructWebhookEvent: jest.fn(),
}));

const { query } = require('../src/config/database');
const jwt = require('jsonwebtoken');

const makeToken = (role = 'consumer', id = 'user-uuid-123') =>
    jwt.sign({ id, email: 'test@test.com', role }, process.env.JWT_SECRET || 'test_secret');

afterAll(() => {});
beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────
// POST /api/subscriptions
// ─────────────────────────────────────────────────
describe('POST /api/subscriptions', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/subscriptions').send({});
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role producteur', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .post('/api/subscriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p1', quantity: 1 }] });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 400 si panier vide', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/subscriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/vide/);
    });

    test('devrait retourner 400 si produit introuvable', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .post('/api/subscriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p-inexistant', quantity: 1 }] });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/introuvable/);
    });

    test('devrait créer un abonnement avec succès', async () => {
        const token = makeToken('consumer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates', price: '3.50' }] })
            .mockResolvedValueOnce({ rows: [{ id: 'sub-1', is_active: true, next_order_date: '2026-06-23' }] });
        const res = await request(app)
            .post('/api/subscriptions')
            .set('Authorization', `Bearer ${token}`)
            .send({ items: [{ product_id: 'p1', quantity: 2 }] });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('subscription_id');
        expect(res.body.status).toBe('active');
    });
});

// ─────────────────────────────────────────────────
// GET /api/subscriptions/mine
// ─────────────────────────────────────────────────
describe('GET /api/subscriptions/mine', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).get('/api/subscriptions/mine');
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role producteur', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .get('/api/subscriptions/mine')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('devrait retourner les abonnements du consommateur', async () => {
        const token = makeToken('consumer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'sub-1', items: [{ product_id: 'p1', quantity: 1 }], is_active: true }] })
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates', price: '3.50', unit: 'kg' }] });
        const res = await request(app)
            .get('/api/subscriptions/mine')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.subscriptions).toHaveLength(1);
    });
});

// ─────────────────────────────────────────────────
// PATCH /api/subscriptions/:id/toggle
// ─────────────────────────────────────────────────
describe('PATCH /api/subscriptions/:id/toggle', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).patch('/api/subscriptions/sub-1/toggle');
        expect(res.status).toBe(401);
    });

    test('devrait retourner 404 si abonnement introuvable', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .patch('/api/subscriptions/sub-inexistant/toggle')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    test('devrait basculer le statut avec succès', async () => {
        const token = makeToken('consumer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'sub-1', is_active: true }] })
            .mockResolvedValueOnce({ rows: [{ id: 'sub-1', is_active: false }] });
        const res = await request(app)
            .patch('/api/subscriptions/sub-1/toggle')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/suspendu/);
    });
});

// ─────────────────────────────────────────────────
// DELETE /api/subscriptions/:id
// ─────────────────────────────────────────────────
describe('DELETE /api/subscriptions/:id', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).delete('/api/subscriptions/sub-1');
        expect(res.status).toBe(401);
    });

    test('devrait retourner 404 si abonnement introuvable', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .delete('/api/subscriptions/sub-inexistant')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(404);
    });

    test('devrait supprimer avec succès', async () => {
        const token = makeToken('consumer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'sub-1' }] })
            .mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .delete('/api/subscriptions/sub-1')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/supprimé/);
    });
});