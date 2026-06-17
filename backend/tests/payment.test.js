// payment.test.js
// Membre 2 — Tests unitaires routes paiement + abonnement
// Lancer : npx jest payment.test.js --coverage

const request = require('supertest');
const app = require('../app'); // ton app Express (sans .listen)
const stripeService = require('../services/stripe.service');
const socketService = require('../services/socket.service');
const db = require('../db');

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../services/stripe.service');
jest.mock('../services/socket.service');
jest.mock('../db');

// Token JWT valide pour les tests (consumer)
const CONSUMER_TOKEN = 'Bearer test-consumer-token';
const PRODUCER_TOKEN = 'Bearer test-producer-token';

// Données fictives réutilisées
const mockOrder = {
  id: 'order-uuid-1',
  consumer_id: 'user-uuid-1',
  status: 'pending',
  total_amount: 9.50,
  stripe_payment_intent_id: null,
};

const mockConsumer = {
  id: 'user-uuid-1',
  email: 'jean@test.fr',
  first_name: 'Jean',
  last_name: 'Dupont',
  stripe_customer_id: 'cus_test123',
};

const mockProducer = {
  stripe_account_id: 'acct_test456',
};

// ── Groupe 1 : POST /api/payments/create-intent ───────────────────────────────

describe('POST /api/payments/create-intent', () => {

  beforeEach(() => {
    jest.clearAllMocks();

    // Simuler les requêtes DB
    db.query
      .mockResolvedValueOnce({ rows: [mockOrder] })         // récupération commande
      .mockResolvedValueOnce({ rows: [mockProducer] })      // compte Stripe producteur
      .mockResolvedValueOnce({ rows: [mockConsumer] })      // récupération consumer
      .mockResolvedValueOnce({ rows: [] });                 // UPDATE orders

    stripeService.createPaymentIntent.mockResolvedValue({
      clientSecret: 'pi_test_secret',
      paymentIntentId: 'pi_test_123',
      platformFee: 76, // 8% de 950 centimes
      producerAmount: 874,
    });
  });

  it('retourne un clientSecret pour une commande valide', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', CONSUMER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientSecret', 'pi_test_secret');
    expect(res.body).toHaveProperty('paymentIntentId', 'pi_test_123');
    expect(res.body).toHaveProperty('platformFee', 76);
  });

  it('calcule correctement la commission de 8%', async () => {
    stripeService.createPaymentIntent.mockImplementation(({ amount }) => {
      const platformFee = Math.round(amount * 0.08);
      return Promise.resolve({
        clientSecret: 'pi_secret',
        paymentIntentId: 'pi_id',
        platformFee,
        producerAmount: amount - platformFee,
      });
    });

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', CONSUMER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(200);
    // 9.50€ = 950 centimes → 8% = 76 centimes
    expect(res.body.platformFee).toBe(76);
  });

  it('retourne 404 si la commande n\'existe pas', async () => {
    db.query.mockReset();
    db.query.mockResolvedValueOnce({ rows: [] }); // commande introuvable

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', CONSUMER_TOKEN)
      .send({ order_id: 'order-inexistante' });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Commande introuvable');
  });

  it('retourne 400 si la commande est déjà payée', async () => {
    db.query.mockReset();
    db.query.mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'confirmed' }] });

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', CONSUMER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/déjà été payée/);
  });

  it('retourne 400 si le producteur n\'a pas de compte Stripe', async () => {
    db.query.mockReset();
    db.query
      .mockResolvedValueOnce({ rows: [mockOrder] })
      .mockResolvedValueOnce({ rows: [{ stripe_account_id: null }] }); // pas de compte

    const res = await request(app)
      .post('/api/payments/create-intent')
      .set('Authorization', CONSUMER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/compte de paiement/);
  });

  it('retourne 401 sans token', async () => {
    const res = await request(app)
      .post('/api/payments/create-intent')
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(401);
  });
});

// ── Groupe 2 : Webhook Stripe ─────────────────────────────────────────────────

describe('POST /api/payments/webhook', () => {

  it('confirme la commande sur payment_intent.succeeded', async () => {
    const mockEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: { order_id: 'order-uuid-1' },
        },
      },
    };

    stripeService.constructWebhookEvent.mockReturnValue(mockEvent);
    db.query.mockResolvedValue({ rows: [] });
    socketService.emitOrderUpdate.mockImplementation(() => {});

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("status = 'confirmed'"),
      ['pi_test_123']
    );
    expect(socketService.emitOrderUpdate).toHaveBeenCalledWith('order-uuid-1', 'confirmed');
  });

  it('annule la commande sur payment_intent.payment_failed', async () => {
    const mockEvent = {
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_fail',
          metadata: { order_id: 'order-uuid-1' },
        },
      },
    };

    stripeService.constructWebhookEvent.mockReturnValue(mockEvent);
    db.query.mockResolvedValue({ rows: [] });
    socketService.emitOrderUpdate.mockImplementation(() => {});

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'valid-sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(mockEvent));

    expect(res.status).toBe(200);
    expect(socketService.emitOrderUpdate).toHaveBeenCalledWith('order-uuid-1', 'cancelled');
  });

  it('retourne 400 si la signature Stripe est invalide', async () => {
    stripeService.constructWebhookEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'bad-sig')
      .set('Content-Type', 'application/json')
      .send('{}');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Signature webhook invalide/);
  });
});

// ── Groupe 3 : POST /api/payments/refund ─────────────────────────────────────

describe('POST /api/payments/refund', () => {

  it('rembourse une commande valide', async () => {
    db.query.mockReset();
    db.query
      .mockResolvedValueOnce({ rows: [{ ...mockOrder, stripe_payment_intent_id: 'pi_test_123', status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [] }); // UPDATE orders

    stripeService.refundPayment.mockResolvedValue({ id: 're_test', status: 'succeeded' });
    socketService.emitOrderUpdate.mockImplementation(() => {});

    const res = await request(app)
      .post('/api/payments/refund')
      .set('Authorization', PRODUCER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('refund_id', 're_test');
    expect(socketService.emitOrderUpdate).toHaveBeenCalledWith('order-uuid-1', 'cancelled');
  });

  it('retourne 400 si la commande est déjà annulée', async () => {
    db.query.mockReset();
    db.query.mockResolvedValueOnce({ rows: [{ ...mockOrder, status: 'cancelled' }] });

    const res = await request(app)
      .post('/api/payments/refund')
      .set('Authorization', PRODUCER_TOKEN)
      .send({ order_id: 'order-uuid-1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Commande déjà annulée/);
  });
});

// ── Groupe 4 : Socket.IO ──────────────────────────────────────────────────────

describe('Socket.IO — emitOrderUpdate', () => {
  const socketService = require('../services/socket.service');

  it('émet le bon payload sur la bonne room', () => {
    const mockIO = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Réinitialiser avec le mock
    socketService.init(mockIO);
    socketService.emitOrderUpdate('order-uuid-1', 'preparing');

    expect(mockIO.to).toHaveBeenCalledWith('order:order-uuid-1');
    expect(mockIO.emit).toHaveBeenCalledWith(
      'order:status_updated',
      expect.objectContaining({
        orderId: 'order-uuid-1',
        status: 'preparing',
        timestamp: expect.any(String),
      })
    );
  });
});

// ── Groupe 5 : Abonnement hebdomadaire (F08) ──────────────────────────────────

describe('POST /api/subscriptions', () => {

  it('crée un abonnement avec les bons items', async () => {
    db.query.mockReset();
    db.query
      .mockResolvedValueOnce({ rows: [{ ...mockConsumer, stripe_customer_id: 'cus_123' }] }) // consumer
      .mockResolvedValueOnce({ rows: [{ id: 'prod-1', price: 3.50, producer_id: 'prod-uuid' }] }) // produits
      .mockResolvedValueOnce({ rows: [{ id: 'sub-uuid-1' }] }) // INSERT subscription
      .mockResolvedValueOnce({ rows: [] }); // INSERT subscription_items

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', CONSUMER_TOKEN)
      .send({
        items: [{ product_id: 'prod-1', quantity: 2 }],
        hub_id: 'hub-uuid-1',
        delivery_day: 'monday',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('subscription_id');
    expect(res.body).toHaveProperty('status', 'active');
    expect(res.body).toHaveProperty('next_billing_date');
  });

  it('retourne 400 si aucun moyen de paiement sauvegardé', async () => {
    db.query.mockReset();
    db.query.mockResolvedValueOnce({ rows: [{ ...mockConsumer, stripe_customer_id: null }] });

    const res = await request(app)
      .post('/api/subscriptions')
      .set('Authorization', CONSUMER_TOKEN)
      .send({
        items: [{ product_id: 'prod-1', quantity: 1 }],
        hub_id: 'hub-uuid-1',
        delivery_day: 'tuesday',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/moyen de paiement/);
  });
});
