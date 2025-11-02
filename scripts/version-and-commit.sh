#!/bin/bash
# Script pour versionner et commiter automatiquement
# Usage: npm run commit:auto "feat: mon message"

set -e

# Vérifier qu'un message a été fourni
if [ -z "$1" ]; then
  echo "❌ Erreur: Vous devez fournir un message de commit"
  echo "Usage: npm run commit:auto \"feat: votre message\""
  exit 1
fi

COMMIT_MSG="$1"

# Extraire le type de commit (feat, fix, refactor, etc.)
if [[ $COMMIT_MSG =~ ^(feat|fix|refactor|perf|docs|style|test|build|ci|chore)(\(.+\))?!?: ]]; then
  echo "✅ Format de commit valide détecté"
else
  echo "⚠️  Attention: Le message ne suit pas le format Conventional Commits"
  echo "   Format recommandé: type(scope): message"
  echo "   Exemples: feat: nouvelle fonctionnalité, fix: correction de bug"
fi

# Étape 1: Bumper la version automatiquement
echo ""
echo "🔄 Versionnage automatique..."
npm run release -- --skip.commit --skip.tag

# Étape 2: Stage uniquement les fichiers déjà trackés + fichiers générés par standard-version
echo ""
echo "📦 Stage des fichiers modifiés..."
git add -u  # Stage only tracked files that are modified or deleted
git add package.json package-lock.json CHANGELOG.md  # Stage version files explicitly

# Étape 3: Créer le commit
echo ""
echo "💾 Création du commit..."
git commit -m "$COMMIT_MSG"

echo ""
echo "✅ Commit créé avec succès!"
echo ""

# Afficher les infos
NEW_VERSION=$(node -p "require('./package.json').version")
echo "📌 Nouvelle version: v$NEW_VERSION"
echo "📝 Message: $COMMIT_MSG"
