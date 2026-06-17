const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// GET /api/users/profile — profil utilisateur connecté
router.get('/profile', authenticate, (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

// PUT /api/users/profile — modifier son profil
router.put('/profile', authenticate, (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

// GET /api/users — admin uniquement
router.get('/', authenticate, authorize('admin'), (req, res) => {
  res.status(501).json({ message: 'À implémenter' });
});

module.exports = router;
