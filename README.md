# 🥦 FoodLoop — Marketplace de circuits courts

> Projet BC04 — Bachelor 3 Chef de Projet Digital  
> Workshop du 17 au 19 Juin 2025

## 👥 Équipe

| Rôle | Responsabilités |
|------|----------------|
| Lead Dev Backend | API, BDD, Auth, Déploiement |
| Dev Backend | Stripe, WebSocket, Abonnements |
| Dev Frontend | React/Next.js, Pages, Intégration UI |
| Design + Docs | Figma, RGPD, Specs, Recettage |

---

## 🏗️ Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 14 (App Router) |
| Backend | Node.js + Express |
| Base de données | PostgreSQL |
| Cache | Redis (optionnel) |
| Paiement | Stripe Connect |
| Temps réel | Socket.IO |
| Déploiement | Render.com |

---

## 📁 Structure du projet

```
foodloop/
├── backend/          # API Node.js + Express
│   ├── src/
│   │   ├── config/       # Config DB, Stripe, etc.
│   │   ├── controllers/  # Logique métier
│   │   ├── middlewares/  # Auth, validation, erreurs
│   │   ├── models/       # Requêtes SQL (pas d'ORM)
│   │   ├── routes/       # Définition des routes
│   │   ├── services/     # Services externes (Stripe, mail...)
│   │   └── utils/        # Helpers divers
│   ├── tests/            # Tests unitaires (Jest)
│   ├── .env.example
│   └── package.json
│
├── frontend/         # Application Next.js
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # Composants réutilisables
│   │   ├── hooks/        # Hooks custom
│   │   ├── lib/          # Config API, utils
│   │   └── types/        # Types TypeScript
│   ├── .env.example
│   └── package.json
│
└── docs/             # Documents livrables
    ├── L1_RGPD.md
    ├── L2_schema_bdd.sql
    └── L3_specs.md
```

---

## 🚀 Installation (à faire sur chaque machine)

### Prérequis

1. **Installer Node.js** (si pas encore fait) :  
   👉 https://nodejs.org/en — télécharger la version **LTS**  
   Vérifier l'installation : `node -v` et `npm -v`

2. **Installer PostgreSQL** :  
   👉 https://www.postgresql.org/download/  
   Ou via Docker : `docker run --name foodloop-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

3. **Cloner le repo** :
   ```bash
   git clone https://github.com/VOTRE-ORG/foodloop.git
   cd foodloop
   ```

### Backend

```bash
cd backend
cp .env.example .env
# Remplir les variables dans .env
npm install
npm run db:migrate    # Créer les tables
npm run dev           # Lancer en mode dev (port 3001)
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Remplir les variables dans .env.local
npm install
npm run dev           # Lancer en mode dev (port 3000)
```

---

## 🌿 Conventions Git

### Branches
```
main          → production uniquement
develop       → branche d'intégration principale
feat/xxx      → nouvelle fonctionnalité
fix/xxx       → correction de bug
```

### Messages de commit
```
feat: ajout authentification JWT
fix: correction calcul panier
docs: mise à jour README
test: tests unitaires route auth
```

### Workflow
1. Toujours partir de `develop` : `git checkout develop && git pull`
2. Créer une branche : `git checkout -b feat/ma-feature`
3. Commit régulièrement
4. Push et ouvrir une Pull Request vers `develop`
5. Un autre membre relit et merge

---

## 🧪 Tests

```bash
cd backend
npm run test          # Lancer tous les tests
npm run test:coverage # Rapport de coverage (objectif : 60%+)
```

---

## 🌐 Déploiement (Render.com)

Voir le fichier `backend/render.yaml` et `frontend/render.yaml` pour la config automatique.

URL de production : **À compléter après déploiement**

---

## 📋 Livrables

| # | Livrable | Fichier/URL | Statut |
|---|---------|-------------|--------|
| L1 | Politique RGPD | `docs/L1_RGPD.md` | ⏳ |
| L2 | Schéma BDD | `docs/L2_schema_bdd.sql` | ⏳ |
| L3 | Specs fonctionnelles | `docs/L3_specs.md` | ⏳ |
| L4 | App déployée | URL Render | ⏳ |
| L5 | Tests unitaires | `backend/tests/` | ⏳ |
| L6 | Dépôt Git | Ce repo | ✅ |
| L7 | Design Figma | Lien Figma | ⏳ |
| L8 | Fonctionnalités | App live | ⏳ |
