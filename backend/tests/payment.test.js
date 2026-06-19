const request = require('supertest');
const { app, server } = require('../src/index');

jest.mock('../src/config/database', () => ({
    query: jest.fn(),
    pool: { connect: jest.fn(), end: jest.fn() },
}));

jest.mock('../src/services/stripe.service', () => ({
    createPaymentIntent: jest.fn(),
    getPaymentIntent: jest.fn(),
    createRefund: jest.fn(),
    constructWebhookEvent: jest.fn(),
}));

jest.mock('../src/services/socket.service', () => ({
    initSocket: jest.fn(),
    emitOrderUpdate: jest.fn(),
}));

const { query } = require('../src/config/database');
const stripeService = require('../src/services/stripe.service');
const jwt = require('jsonwebtoken');

const makeToken = (role = 'consumer', id = 'user-uuid-123') =>
    jwt.sign({ id, email: 'test@test.com', role }, process.env.JWT_SECRET || 'test_secret');

afterAll(() => {});

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────
// POST /api/payments/create-intent
// ─────────────────────────────────────────────────
describe('POST /api/payments/create-intent', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/payments/create-intent').send({ order_id: 'order-1' });
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role producteur', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 400 si order_id manquant', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/order_id requis/);
    });

    test('devrait retourner 404 si commande introuvable', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-inexistant' });
        expect(res.status).toBe(404);
    });

    test('devrait retourner 400 si commande déjà payée', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [{ id: 'order-1', total_amount: '9.50', platform_fee: '0.76', status: 'confirmed', stripe_payment_intent_id: 'pi_existing' }] });
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/déjà été payée/);
    });

    test('devrait retourner 400 si commande annulée', async () => {
        const token = makeToken('consumer');
        query.mockResolvedValueOnce({ rows: [{ id: 'order-1', total_amount: '9.50', platform_fee: '0.76', status: 'cancelled', stripe_payment_intent_id: null }] });
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/annulée/);
    });

    test('devrait créer un PaymentIntent avec succès', async () => {
        const token = makeToken('consumer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'order-1', total_amount: '9.50', platform_fee: '0.76', status: 'pending', stripe_payment_intent_id: null }] })
            .mockResolvedValueOnce({ rows: [] });
        stripeService.createPaymentIntent.mockResolvedValueOnce({
            id: 'pi_test_123',
            client_secret: 'pi_test_123_secret',
        });
        const res = await request(app)
            .post('/api/payments/create-intent')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('clientSecret', 'pi_test_123_secret');
        expect(res.body).toHaveProperty('paymentIntentId', 'pi_test_123');
        expect(res.body.amount).toBe(950);
    });
});

// ─────────────────────────────────────────────────
// POST /api/payments/confirm
// ─────────────────────────────────────────────────
describe('POST /api/payments/confirm', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/payments/confirm').send({});
        expect(res.status).toBe(401);
    });

    test('devrait retourner 400 si champs manquants', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/payments/confirm')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(400);
    });

    test('devrait retourner 400 si paiement non confirmé par Stripe', async () => {
        const token = makeToken('consumer');
        stripeService.getPaymentIntent.mockResolvedValueOnce({ status: 'processing' });
        const res = await request(app)
            .post('/api/payments/confirm')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1', payment_intent_id: 'pi_test' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/non confirmé/);
    });

    test('devrait confirmer le paiement avec succès', async () => {
        const token = makeToken('consumer');
        stripeService.getPaymentIntent.mockResolvedValueOnce({ status: 'succeeded' });
        query.mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'confirmed' }] });
        const res = await request(app)
            .post('/api/payments/confirm')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1', payment_intent_id: 'pi_test' });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/confirmé/);
    });
});

// ─────────────────────────────────────────────────
// POST /api/payments/refund
// ─────────────────────────────────────────────────
describe('POST /api/payments/refund', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/payments/refund').send({});
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role consumer', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/payments/refund')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 404 si commande introuvable', async () => {
        const token = makeToken('admin');
        query.mockResolvedValueOnce({ rows: [] });
        const res = await request(app)
            .post('/api/payments/refund')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-inexistant' });
        expect(res.status).toBe(404);
    });

    test('devrait retourner 400 si commande déjà annulée', async () => {
        const token = makeToken('admin');
        query.mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'cancelled', stripe_payment_intent_id: 'pi_test' }] });
        const res = await request(app)
            .post('/api/payments/refund')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/annulée/);
    });

    test('devrait rembourser avec succès', async () => {
        const token = makeToken('admin');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'order-1', status: 'confirmed', stripe_payment_intent_id: 'pi_test' }] })
            .mockResolvedValueOnce({ rows: [] });
        stripeService.createRefund.mockResolvedValueOnce({ id: 're_test' });
        const res = await request(app)
            .post('/api/payments/refund')
            .set('Authorization', `Bearer ${token}`)
            .send({ order_id: 'order-1' });
        expect(res.status).toBe(200);
        expect(res.body.refund_id).toBe('re_test');
    });
});