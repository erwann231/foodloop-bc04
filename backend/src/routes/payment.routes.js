// payment.routes.js
// Membre 2 — Déclaration des routes /api/payments et /api/subscriptions

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const subscriptionController = require('../controllers/subscription.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// ── Routes paiement ──────────────────────────────────────────────────────────

// POST /api/payments/create-intent — consumer connecté, crée un PaymentIntent
router.post('/payments/create-intent', authenticate, authorize('consumer'), paymentController.createPaymentIntent);

// POST /api/payments/setup-intent — consumer, sauvegarde CB pour l'abonnement
router.post('/payments/setup-intent', authenticate, authorize('consumer'), paymentController.createSetupIntent);

// POST /api/payments/refund — producteur ou admin, rembourse une commande
router.post('/payments/refund', authenticate, authorize('producer', 'admin'), paymentController.refundOrder);

// POST /api/payments/connect-account — producer, crée/récupère le lien d'onboarding Stripe
router.post('/payments/connect-account', authenticate, authorize('producer'), paymentController.createConnectAccount);

// GET /api/payments/connect-account/status — producer, vérifie si l'onboarding est terminé
router.get('/payments/connect-account/status', authenticate, authorize('producer'), paymentController.getConnectAccountStatus);

// POST /api/payments/webhook — Stripe uniquement (pas d'auth JWT)
// ⚠️ Ce endpoint doit être déclaré AVANT express.json() dans app.js
//    pour recevoir le raw body. Voir l'exemple app.js ci-dessous.
router.post(
  '/payments/webhook',
  express.raw({ type: 'application/json' }), // raw body pour vérification signature
  paymentController.handleWebhook
);

// ── Routes abonnement (F08) ──────────────────────────────────────────────────

// POST /api/subscriptions — créer un abonnement hebdomadaire
router.post('/subscriptions', authenticate, authorize('consumer'), subscriptionController.create);

// GET /api/subscriptions/mine — mes abonnements actifs
router.get('/subscriptions/mine', authenticate, authorize('consumer'), subscriptionController.getMine);

// PUT /api/subscriptions/:id — modifier un abonnement
router.put('/subscriptions/:id', authenticate, authorize('consumer'), subscriptionController.update);

// DELETE /api/subscriptions/:id — annuler un abonnement
router.delete('/subscriptions/:id', authenticate, authorize('consumer'), subscriptionController.cancel);

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// EXEMPLE : comment intégrer dans app.js
// ─────────────────────────────────────────────────────────────────────────────
/*
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const paymentRoutes = require('./routes/payment.routes');
const socketService = require('./services/socket.service');
const subscriptionService = require('./services/subscription.service');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL } });

// ⚠️ Le webhook Stripe doit être avant express.json()
app.use('/api', paymentRoutes);       // contient la route /webhook avec raw body

// Ensuite le JSON pour toutes les autres routes
app.use(express.json());

// Middleware pour exposer rawBody (nécessaire pour la vérification de signature Stripe)
app.use((req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => { req.rawBody = data; next(); });
  } else {
    next();
  }
});

// Initialiser Socket.IO
socketService.init(io);

// Cron : débit des abonnements tous les jours à 8h00
cron.schedule('0 8 * * *', () => {
  subscriptionService.processWeeklyBillings();
});

server.listen(3001, () => console.log('Backend démarré sur le port 3001'));
*/
