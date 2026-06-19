const request = require('supertest');
const { app, server } = require('../src/index');

// Mock de la base de données pour les tests
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { end: jest.fn(), connect: jest.fn() },
}));

const { query } = require('../src/config/database');

afterAll(() => {});

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('devrait créer un utilisateur avec les bons champs', async () => {
    query
        .mockResolvedValueOnce({ rows: [] }) // vérification email inexistant
        .mockResolvedValueOnce({
          rows: [{
            id: 'uuid-test',
            email: 'test@test.com',
            first_name: 'Jean',
            last_name: 'Dupont',
            role: 'consumer',
            created_at: new Date(),
          }],
        });

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@test.com',
      password: 'motdepasse123',
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'consumer',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@test.com');
  });

  test('devrait refuser si email manquant', async () => {
    const res = await request(app).post('/api/auth/register').send({
      password: 'motdepasse123',
      first_name: 'Jean',
      last_name: 'Dupont',
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('devrait refuser si email déjà utilisé', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'existing-uuid' }] });

    const res = await request(app).post('/api/auth/register').send({
      email: 'existing@test.com',
      password: 'motdepasse123',
      first_name: 'Jean',
      last_name: 'Dupont',
    });

    expect(res.status).toBe(409);
  });

  test('devrait refuser un rôle invalide', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@test.com',
      password: 'motdepasse123',
      first_name: 'Jean',
      last_name: 'Dupont',
      role: 'superadmin',
    });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('devrait retourner 400 si champs manquants', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(400);
  });

  test('devrait retourner 401 si utilisateur inexistant', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send({
      email: 'inconnu@test.com',
      password: 'motdepasse123',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  test('devrait retourner 401 sans token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /health', () => {
  test('devrait retourner status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});