# Guide de contribution - ZoomChat

Merci de votre intérêt pour contribuer au projet ZoomChat ! Ce document vous guidera à travers les conventions et le workflow du projet.

---

## 📋 Commits conventionnels (Conventional Commits)

Ce projet utilise la spécification [Conventional Commits](https://www.conventionalcommits.org/fr/) pour maintenir un historique Git clair et générer automatiquement le versionnement sémantique.

### Format des messages de commit

```
<type>(<scope>): <description>

[corps optionnel]

[footer optionnel]
```

### Types de commits

| Type | Description | Impact version | Apparaît dans CHANGELOG |
|------|-------------|----------------|------------------------|
| `feat` | Nouvelle fonctionnalité | MINOR (1.x.0) | ✅ Oui |
| `fix` | Correction de bug | PATCH (1.0.x) | ✅ Oui |
| `perf` | Amélioration des performances | PATCH (1.0.x) | ✅ Oui |
| `refactor` | Refactoring du code | - | ✅ Oui |
| `docs` | Modification de documentation | - | ✅ Oui |
| `style` | Changements de style (formatage, etc.) | - | ❌ Non |
| `test` | Ajout ou modification de tests | - | ❌ Non |
| `build` | Changements du système de build | - | ❌ Non |
| `ci` | Changements de configuration CI/CD | - | ❌ Non |
| `chore` | Tâches de maintenance | - | ❌ Non |

### Breaking Changes (MAJOR)

Pour indiquer un changement incompatible (breaking change) qui nécessite un MAJOR (x.0.0) :

```bash
feat(api)!: modification de l'interface d'abonnement

BREAKING CHANGE: Le paramètre 'telephone' est maintenant obligatoire pour s'abonner
```

ou simplement ajouter `!` après le type/scope :

```bash
feat!: nouvelle API incompatible avec l'ancienne version
```

---

## 📝 Exemples de commits

### ✅ Bons exemples

```bash
# Nouvelle fonctionnalité (MINOR: 1.0.0 → 1.1.0)
git commit -m "feat: ajout de la commande /dernier pour consulter la dernière parution"

# Correction de bug (PATCH: 1.0.0 → 1.0.1)
git commit -m "fix: correction de l'erreur lors du désabonnement"

# Optimisation (PATCH)
git commit -m "perf: amélioration des performances de recherche avec indexation"

# Documentation
git commit -m "docs: mise à jour du README avec instructions de déploiement"

# Refactoring
git commit -m "refactor: restructuration du code en services modulaires"

# Avec scope
git commit -m "feat(bot): ajout du système d'alertes personnalisées"
git commit -m "fix(database): correction de la requête SQL pour les abonnés actifs"

# Breaking change (MAJOR: 1.0.0 → 2.0.0)
git commit -m "feat!: migration vers PostgreSQL

BREAKING CHANGE: L'ancienne base de données SQLite n'est plus supportée"
```

### ❌ Mauvais exemples

```bash
# Trop vague
git commit -m "fix: corrections"
git commit -m "feat: ajout de trucs"

# Pas de type
git commit -m "ajout de la fonctionnalité X"

# Majuscule au début de la description
git commit -m "feat: Ajout du système d'alertes"

# Point final inutile
git commit -m "fix: correction du bug."
```

---

## 🔄 Workflow de développement

### 1. Créer une branche de travail

```bash
git checkout -b feat/nom-de-la-fonctionnalite
# ou
git checkout -b fix/nom-du-bug
```

### 2. Développer et commiter

```bash
# Faire des modifications
git add .
git commit -m "feat: description de la fonctionnalité"
```

### 3. Avant de merger : créer une nouvelle version

```bash
# Détection automatique du type de version basée sur les commits
npm run release

# Ou forcer un type spécifique
npm run release:major   # 1.0.0 → 2.0.0
npm run release:minor   # 1.0.0 → 1.1.0
npm run release:patch   # 1.0.0 → 1.0.1
```

Cette commande va automatiquement :
- ✅ Analyser les commits depuis la dernière version
- ✅ Déterminer le type de version (MAJOR/MINOR/PATCH)
- ✅ Mettre à jour `package.json`
- ✅ Générer/mettre à jour `CHANGELOG.md`
- ✅ Créer un commit de release

### 4. Push et déploiement

```bash
git push origin main
# Déployer la nouvelle version sur GCP
```

---

## 📚 Versionnement sémantique (Semver)

Le projet suit le versionnement sémantique : `MAJOR.MINOR.PATCH`

- **MAJOR** (x.0.0) : Changements incompatibles avec les versions précédentes
- **MINOR** (1.x.0) : Ajout de fonctionnalités rétrocompatibles
- **PATCH** (1.0.x) : Corrections de bugs rétrocompatibles

### Exemples

```
1.0.0  → Version initiale
1.0.1  → Correction d'un bug (fix)
1.1.0  → Nouvelle fonctionnalité (feat)
2.0.0  → Changement incompatible (BREAKING CHANGE)
```

---

## 🧪 Tests avant commit

Avant de commiter, assurez-vous que :

1. ✅ Le code fonctionne localement (`npm run dev`)
2. ✅ Le message de commit suit les conventions
3. ✅ Les tests passent (si disponibles)
4. ✅ La documentation est à jour

---

## 📖 Ressources

- [Conventional Commits](https://www.conventionalcommits.org/fr/)
- [Semantic Versioning](https://semver.org/lang/fr/)
- [Standard Version](https://github.com/conventional-changelog/standard-version)

---

## 💡 Questions ?

Si vous avez des questions ou suggestions, n'hésitez pas à ouvrir une issue sur le dépôt GitHub.

Merci pour votre contribution ! 🙏
