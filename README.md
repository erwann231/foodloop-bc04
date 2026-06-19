# 🥦 FoodLoop — Marketplace de circuits courts

> Projet BC04 — Bachelor 3 Chef de Projet Digital  
> Workshop du 17 au 19 Juin 2026

---

## 🌐 Application en production

| Service | URL |
|---------|-----|
| **Frontend** | https://foodloop-frontend.onrender.com |
| **Backend API** | https://foodloop-backend-f20e.onrender.com |
| **Health check** | https://foodloop-backend-f20e.onrender.com/health |

### Comptes de test

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Consommateur | consommateur@test-foodloop.fr | password123 |
| Producteur | ferme.dupont@test-foodloop.fr | password123 |
| Producteur | maraicher.martin@test-foodloop.fr | password123 |

### Paiement Stripe (mode test)
- Numéro : `4242 4242 4242 4242`
- Date : `12/34` — CVC : `123`

---

## 👥 Équipe

| Membre                  | Rôle | Responsabilités |
|-------------------------|------|----------------|
| Erwann SAMI             | Lead Dev Backend | API, BDD, Auth, Déploiement, Tests |
| Dennise Sophie TJIE     | Dev Backend | Stripe, Socket.IO, Abonnements |
| Jean-Baptiste PELISSIER | Dev Frontend | Pages React/Next.js, Intégration UI |
| Oussama ELBOUAZZAOUI    | Design + Docs | Figma, RGPD, Specs fonctionnelles |

---

## 🏗️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js + Express |
| Base de données | PostgreSQL 16 |
| Temps réel | Socket.IO |
| Paiement | Stripe Connect |
| Tests | Jest 29 + Supertest |
| Déploiement | Render.com |

---

## 📁 Structure du projet

```
foodloop/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── config/       # Config DB, migration SQL, seed
│   │   ├── controllers/  # Auth, produits, commandes, paiements, abonnements
│   │   ├── middlewares/  # JWT, gestion erreurs
│   │   ├── routes/       # Définition des routes API
│   │   └── services/     # Socket.IO, Stripe
│   └── tests/            # Tests unitaires Jest (5 suites, 60 tests, 80% coverage)
│
├── frontend/         # Application Next.js
│   └── src/
│       ├── app/          # Pages (auth, produits, panier, commandes, dashboard, abonnements, paiement)
│       ├── components/   # Navbar responsive
│       └── lib/          # Client API centralisé
│
└── docs/             # Livrables PDF (L1 à L8)
    ├── L1_Politique_RGPD_FoodLoop.pdf
    ├── L2_Schema_BDD_FoodLoop.pdf
    ├── L3_Specifications_FoodLoop.pdf
    ├── L4_Application_Deployee_FoodLoop.pdf
    ├── L5_Tests_Unitaires_FoodLoop.pdf
    ├── L6_Depot_Git_FoodLoop.pdf
    ├── L7_Design_Figma_FoodLoop.pdf
    └── L8_Fonctionnalites_FoodLoop.pdf
```

---

## 🚀 Installation en local

### Prérequis
- Node.js v20 LTS
- PostgreSQL 16
- Git

### Backend

```bash
cd backend
cp .env.example .env
# Remplir DB_PASSWORD et JWT_SECRET dans .env
npm install
npm run db:migrate
npm run dev
# Serveur sur http://localhost:3001
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# App sur http://localhost:3000
```

### Données de test

```bash
cd backend
node src/config/seed.js
# Insère 3 producteurs et 12 produits de test
```

---

## 🧪 Tests unitaires

```bash
cd backend
npm run test:coverage
```

**Résultat attendu :**
- ✅ 5 suites de tests
- ✅ 60 tests passés
- ✅ 80% de couverture de code

---

## 🌿 Workflow Git

```
main      → production (déploiement automatique Render)
develop   → intégration
feat/xxx  → fonctionnalités
```

```bash
git checkout develop && git pull origin develop
git checkout -b feat/ma-feature
# ... développement ...
git add . && git commit -m "feat: description"
git push origin feat/ma-feature
# → Ouvrir une Pull Request vers develop sur GitHub
```

---

## 📡 Routes API principales

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | Non | Inscription |
| POST | `/api/auth/login` | Non | Connexion |
| GET | `/api/auth/me` | Oui | Profil connecté |
| GET | `/api/products` | Non | Liste produits avec filtres |
| POST | `/api/products` | Producteur | Créer un produit |
| PUT | `/api/products/:id` | Producteur | Modifier un produit |
| DELETE | `/api/products/:id` | Producteur | Supprimer un produit |
| POST | `/api/orders` | Consumer | Passer une commande |
| GET | `/api/orders/mine` | Consumer | Mes commandes |
| GET | `/api/orders/producer` | Producteur | Commandes du jour |
| PATCH | `/api/orders/:id/status` | Producer/Consumer | Changer statut |
| POST | `/api/payments/create-intent` | Consumer | Créer PaymentIntent Stripe |
| POST | `/api/payments/confirm` | Consumer | Confirmer paiement |
| POST | `/api/subscriptions` | Consumer | Créer abonnement |
| GET | `/api/subscriptions/mine` | Consumer | Mes abonnements |

---

## 📋 Livrables

| # | Livrable | Fichier / URL | Statut |
|---|---------|---------------|--------|
| L1 | Politique RGPD | `docs/L1_Politique_RGPD_FoodLoop.pdf` | ✅ |
| L2 | Schéma BDD | `docs/L2_Schema_BDD_FoodLoop.pdf` | ✅ |
| L3 | Specs fonctionnelles | `docs/L3_Specifications_FoodLoop.pdf` | ✅ |
| L4 | App déployée | https://foodloop-frontend.onrender.com | ✅ |
| L5 | Tests unitaires (80%) | `docs/L5_Tests_Unitaires_FoodLoop.pdf` | ✅ |
| L6 | Dépôt Git | https://github.com/erwann231/foodloop-bc04 — tag v1.0 | ✅ |
| L7 | Design Figma | `docs/L7_Design_Figma_FoodLoop.pdf` | ✅ |
| L8 | Fonctionnalités F01-F08 | `docs/L8_Fonctionnalites_FoodLoop.pdf` | ✅ |