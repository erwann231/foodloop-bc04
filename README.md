# 🥦 FoodLoop — Marketplace de circuits courts

Projet BC04 — Bachelor 3 Chef de Projet Digital  
Workshop du 17 au 19 Juin 2026

## 🌐 Application en production

| Service | URL |
| :---- | :---- |
| **Frontend** | [https://foodloop-frontend.onrender.com](https://foodloop-frontend.onrender.com) |
| **Backend API** | [https://foodloop-backend-f20e.onrender.com](https://foodloop-backend-f20e.onrender.com) |
| **Health check** | [https://foodloop-backend-f20e.onrender.com/health](https://foodloop-backend-f20e.onrender.com/health) |

---

## 👥 Équipe

| Membre | Rôle | Responsabilités |
| :---- | :---- | :---- |
| Erwan | Lead Dev Backend | API, BDD, Auth, Déploiement, Tests |
| Membre 2 | Dev Backend | Stripe, Socket.IO, Abonnements |
| Membre 3 | Dev Frontend | Pages React/Next.js, Intégration UI |
| Membre 4 | Design \+ Docs | Figma, RGPD, Specs fonctionnelles |

---

## 🏗️ Stack technique

| Couche | Technologie |
| :---- | :---- |
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js \+ Express |
| Base de données | PostgreSQL |
| Temps réel | Socket.IO |
| Paiement | Stripe Connect |
| Déploiement | Render.com |

---

## 📁 Structure du projet

foodloop/

├── backend/          \# API Node.js \+ Express

│   ├── src/

│   │   ├── config/       \# Config DB, migration SQL

│   │   ├── controllers/  \# Auth, produits, commandes

│   │   ├── middlewares/  \# JWT, gestion erreurs

│   │   ├── routes/       \# Définition des routes API

│   │   └── services/     \# Socket.IO, Stripe

│   └── tests/            \# Tests unitaires Jest (coverage 78%)

│

├── frontend/         \# Application Next.js

│   └── src/

│       ├── app/          \# Pages (App Router)

│       ├── components/   \# Navbar

│       └── lib/          \# Client API centralisé

│

└── docs/             \# Documents livrables

---

## 🚀 Installation en local

### Prérequis

- Node.js v20 LTS  
- PostgreSQL 16  
- Git

### Backend

cd backend

cp .env.example .env

\# Remplir DB\_PASSWORD et JWT\_SECRET dans .env

npm install

npm run db:migrate

npm run dev

\# Serveur sur http://localhost:3001

### Frontend

cd frontend

cp .env.example .env.local

npm install

npm run dev

\# App sur http://localhost:3000

---

## 🌿 Workflow Git

main      → production (déploiement automatique Render)

develop   → intégration

feat/xxx  → fonctionnalités

\# Créer une branche

git checkout develop && git pull origin develop

git checkout \-b feat/ma-feature

\# Committer

git add .

git commit \-m "feat: description"

git push origin feat/ma-feature

\# → Ouvrir une Pull Request vers develop sur GitHub

---

## 🧪 Tests

cd backend

npm run test           \# Lancer les tests

npm run test:coverage  \# Rapport coverage (78%)

---

## 📡 Routes API principales

| Méthode | Route | Auth | Description |
| :---- | :---- | :---- | :---- |
| POST | `/api/auth/register` | Non | Inscription |
| POST | `/api/auth/login` | Non | Connexion |
| GET | `/api/auth/me` | Oui | Profil connecté |
| GET | `/api/products` | Non | Liste produits avec filtres |
| POST | `/api/products` | Producteur | Créer un produit |
| POST | `/api/orders` | Consumer | Passer une commande |
| GET | `/api/orders/mine` | Consumer | Mes commandes |
| PATCH | `/api/orders/:id/status` | Producteur | Changer statut |

---

## 📋 Livrables

| \# | Livrable | Fichier / URL | Statut |
| :---- | :---- | :---- | :---- |
| L1 | Politique RGPD | `docs/L1_RGPD.md` | ⏳ |
| L2 | Schéma BDD | `backend/src/config/migrate.js` | ✅ |
| L3 | Specs fonctionnelles | `docs/L3_specs.md` | ⏳ |
| L4 | App déployée | [https://foodloop-frontend.onrender.com](https://foodloop-frontend.onrender.com) | ✅ |
| L5 | Tests unitaires | `backend/tests/` — coverage 78% | ✅ |
| L6 | Dépôt Git | [https://github.com/erwann231/foodloop-bc04](https://github.com/erwann231/foodloop-bc04) | ✅ |
| L7 | Design Figma | Lien Figma | ⏳ |
| L8 | Fonctionnalités F01-F08 | App live | 🔄 |

