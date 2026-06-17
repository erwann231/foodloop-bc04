require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron'); // ← AJOUT 1
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const paymentRoutes = require('./routes/payment.routes'); // ← AJOUT 2
const { errorHandler } = require('./middlewares/error.middleware');
const { initSocket } = require('./services/socket.service');
const subscriptionService = require('./services/subscription.service'); // ← AJOUT 3

const app = express();
const server = http.createServer(app);

// Socket.IO pour le temps réel
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});
initSocket(io);

// ⚠️ WEBHOOK STRIPE — doit être AVANT express.json()
// Stripe envoie du raw body, pas du JSON parsé
app.use('/api/payments/webhook', express.raw({ type: 'application/json' })); // ← AJOUT 4

// Middlewares globaux
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api', paymentRoutes); // ← AJOUT 5 (couvre /api/payments/* et /api/subscriptions/*)

// Health check (utile pour Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cron : débit des abonnements hebdomadaires tous les jours à 8h00 ← AJOUT 6
cron.schedule('0 8 * * *', () => {
  console.log('⏰ Lancement débit abonnements hebdomadaires...');
  subscriptionService.processWeeklyBillings();
});

// Gestion des erreurs (toujours en dernier)
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur FoodLoop démarré sur le port ${PORT}`);
  console.log(`📡 Environnement : ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
