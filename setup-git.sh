#!/bin/bash
# ==============================================
# FOODLOOP — Script d'initialisation Git
# À lancer UNE SEULE FOIS par le Lead Dev Backend
# ==============================================

echo "🥦 Initialisation du repo FoodLoop..."

# Initialiser Git
git init
git add .
git commit -m "feat: setup initial monorepo FoodLoop — BC04 Workshop"

# Créer la branche develop
git checkout -b develop
git checkout main 2>/dev/null || git checkout master

echo ""
echo "✅ Repo initialisé !"
echo ""
echo "📋 Prochaines étapes :"
echo "  1. Créer le repo sur GitHub (github.com/new)"
echo "     Nom suggéré : foodloop-bc04"
echo "     Visibilité  : Public (pour le jury)"
echo ""
echo "  2. Connecter le repo distant :"
echo "     git remote add origin https://github.com/VOTRE_USERNAME/foodloop-bc04.git"
echo "     git push -u origin main"
echo "     git push origin develop"
echo ""
echo "  3. Inviter les 3 autres membres comme collaborateurs :"
echo "     GitHub > Settings > Collaborators > Add people"
echo ""
echo "  4. Chaque membre clone le repo :"
echo "     git clone https://github.com/VOTRE_USERNAME/foodloop-bc04.git"
echo "     cd foodloop-bc04"
echo "     npm run install:all"
echo ""
echo "  5. Chacun crée sa branche de travail :"
echo "     git checkout develop"
echo "     git checkout -b feat/mon-feature"
