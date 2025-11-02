#!/bin/bash
# Script d'installation du hook pre-commit pour le versioning automatique

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

# Créer le dossier hooks s'il n'existe pas
mkdir -p "$HOOK_DIR"

# Créer le hook pre-commit
cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
# Hook pre-commit : Versionnage automatique avec standard-version

# Vérifier s'il y a des fichiers stagés
if git diff --cached --quiet; then
  exit 0
fi

# Exécuter standard-version pour bumper la version
echo "🔄 Versionnage automatique..."
npm run release -- --skip.commit --skip.tag --silent

# Ajouter les fichiers modifiés par standard-version
git add -u
git add package.json package-lock.json CHANGELOG.md 2>/dev/null

echo "✅ Version mise à jour automatiquement"
EOF

# Rendre le hook exécutable
chmod +x "$HOOK_FILE"

echo "✅ Hook pre-commit installé avec succès dans $HOOK_FILE"
echo "   Le versioning se fera automatiquement à chaque 'git commit'"
