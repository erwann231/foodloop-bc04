let io;

/**
 * Initialiser Socket.IO
 * @param {Server} socketIo - Instance Socket.IO
 */
const initSocket = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log(`🔌 Client connecté : ${socket.id}`);

    // Rejoindre une room de commande (pour suivre une commande spécifique)
    socket.on('join:order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`📦 Client ${socket.id} suit la commande ${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client déconnecté : ${socket.id}`);
    });
  });
};

/**
 * Émettre une mise à jour de statut de commande
 * @param {string} orderId - ID de la commande
 * @param {string} status - Nouveau statut
 */
const emitOrderUpdate = (orderId, status) => {
  if (io) {
    io.to(`order:${orderId}`).emit('order:status_updated', { orderId, status, timestamp: new Date() });
  }
};

module.exports = { initSocket, emitOrderUpdate };
