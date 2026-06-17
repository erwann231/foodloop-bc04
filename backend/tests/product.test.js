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

const { query } = require('../src/config/database');
const jwt = require('jsonwebtoken');

const makeToken = (role = 'consumer', id = 'user-uuid-123') => {
    return jwt.sign({ id, email: 'test@test.com', role }, process.env.JWT_SECRET || 'test_secret');
};

afterAll((done) => {
    server.close(done);
});

beforeEach(() => {
    jest.clearAllMocks();
});

// ─────────────────────────────────────────────────
// GET /api/products
// ─────────────────────────────────────────────────
describe('GET /api/products', () => {
    test('devrait retourner la liste des produits sans auth', async () => {
        query.mockResolvedValueOnce({
            rows: [
                { id: 'p1', name: 'Tomates', price: '3.50', category: 'legumes', farm_name: 'Ferme Dupont' },
                { id: 'p2', name: 'Carottes', price: '2.00', category: 'legumes', farm_name: 'Ferme Martin' },
            ],
            rowCount: 2,
        });

        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(2);
        expect(res.body.count).toBe(2);
    });

    test('devrait retourner une liste vide si aucun produit', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app).get('/api/products');
        expect(res.status).toBe(200);
        expect(res.body.products).toHaveLength(0);
    });

    test('devrait accepter les filtres en query string', async () => {
        query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

        const res = await request(app).get('/api/products?city=Paris&category=legumes&search=tomate');
        expect(res.status).toBe(200);
    });
});

// ─────────────────────────────────────────────────
// GET /api/products/:id
// ─────────────────────────────────────────────────
describe('GET /api/products/:id', () => {
    test('devrait retourner un produit par son id', async () => {
        query.mockResolvedValueOnce({
            rows: [{ id: 'p1', name: 'Tomates', price: '3.50', farm_name: 'Ferme Dupont' }],
        });

        const res = await request(app).get('/api/products/p1');
        expect(res.status).toBe(200);
        expect(res.body.product.name).toBe('Tomates');
    });

    test('devrait retourner 404 si produit introuvable', async () => {
        query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/api/products/uuid-inexistant');
        expect(res.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────
// POST /api/products
// ─────────────────────────────────────────────────
describe('POST /api/products', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).post('/api/products').send({ name: 'Tomates', price: 3.5, unit: 'kg' });
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si role consommateur', async () => {
        const token = makeToken('consumer');
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates', price: 3.5, unit: 'kg' });
        expect(res.status).toBe(403);
    });

    test('devrait retourner 400 si champs obligatoires manquants', async () => {
        const token = makeToken('producer');
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates' }); // manque price et unit
        expect(res.status).toBe(400);
    });

    test('devrait retourner 403 si profil producteur introuvable', async () => {
        const token = makeToken('producer');
        query.mockResolvedValueOnce({ rows: [] }); // pas de profil producteur

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates', price: 3.5, unit: 'kg' });
        expect(res.status).toBe(403);
    });

    test('devrait créer un produit avec succès', async () => {
        const token = makeToken('producer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'prod-uuid' }] }) // profil producteur
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates', price: '3.50', unit: 'kg', producer_id: 'prod-uuid' }] }); // INSERT

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates', price: 3.5, unit: 'kg', category: 'legumes' });
        expect(res.status).toBe(201);
        expect(res.body.product.name).toBe('Tomates');
    });
});

// ─────────────────────────────────────────────────
// PUT /api/products/:id
// ─────────────────────────────────────────────────
describe('PUT /api/products/:id', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).put('/api/products/p1').send({ name: 'Tomates bio' });
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si le produit appartient a un autre producteur', async () => {
        const token = makeToken('producer');
        query.mockResolvedValueOnce({ rows: [] }); // produit non trouvé pour cet user

        const res = await request(app)
            .put('/api/products/p1')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates bio' });
        expect(res.status).toBe(403);
    });

    test('devrait modifier le produit avec succès', async () => {
        const token = makeToken('producer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // vérif propriétaire
            .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Tomates bio', price: '4.00' }] }); // UPDATE

        const res = await request(app)
            .put('/api/products/p1')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Tomates bio', price: 4.0 });
        expect(res.status).toBe(200);
        expect(res.body.product.name).toBe('Tomates bio');
    });
});

// ─────────────────────────────────────────────────
// DELETE /api/products/:id
// ─────────────────────────────────────────────────
describe('DELETE /api/products/:id', () => {
    test('devrait retourner 401 sans token', async () => {
        const res = await request(app).delete('/api/products/p1');
        expect(res.status).toBe(401);
    });

    test('devrait retourner 403 si le produit appartient a un autre producteur', async () => {
        const token = makeToken('producer');
        query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app)
            .delete('/api/products/p1')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    test('devrait supprimer le produit avec succès', async () => {
        const token = makeToken('producer');
        query
            .mockResolvedValueOnce({ rows: [{ id: 'p1' }] }) // vérif propriétaire
            .mockResolvedValueOnce({ rows: [] }); // DELETE

        const res = await request(app)
            .delete('/api/products/p1')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/supprimé/i);
    });
});