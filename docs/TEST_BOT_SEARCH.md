# Test de la recherche dans le bot Telegram

## 🧪 Scénarios de test

### 1. Recherche réussie avec résultats

**Action** : Envoyer "studio" au bot

**Résultat attendu** :
```
🔍 X annonce(s) trouvée(s)
📝 Recherche : "studio"

─────────────────────

1. *[Immobilier]*
STUDIO À COSYGA chambre, grande cuisine, grande douche/wc...
📞 066 04 15 20
💰 110 000 FCFA

2. *[Immobilier]*
STUDIO AU HAUT DE GUE-GUE chambre avec douche, salon...
📞 074 98 05 67
💰 170 000 FCFA
```

### 2. Recherche sans résultats

**Action** : Envoyer "château à Paris" au bot

**Résultat attendu** :
```
😔 Aucune annonce trouvée

Je n'ai pas trouvé d'annonces correspondant à "château à Paris".

💡 Conseils :
• Essayez avec des mots-clés plus simples
• Vérifiez l'orthographe
• Utilisez des termes génériques
```

### 3. Message trop long

**Action** : Envoyer un message de plus de 200 caractères

**Résultat attendu** :
```
⚠️ Votre recherche est trop longue.

Veuillez limiter votre recherche à 200 caractères maximum.
```

### 4. Recherche par catégorie

**Actions à tester** :
- "emploi chauffeur" → Résultats de la catégorie Emploi
- "Toyota" → Résultats de la catégorie Véhicule
- "terrain Ntoum" → Résultats de la catégorie Immobilier

### 5. Commandes ignorées

**Action** : Envoyer "/start", "/aide", etc.

**Résultat attendu** : Les commandes sont gérées par leurs handlers respectifs, pas par le handler de recherche

## 📊 Points de vérification

- ✅ Le bot affiche "typing..." pendant la recherche
- ✅ Les résultats sont formatés avec Markdown
- ✅ Les numéros de téléphone sont affichés
- ✅ Les prix sont affichés
- ✅ Le texte est tronqué à 200 caractères
- ✅ Maximum 10 résultats affichés
- ✅ Message d'aide si aucun résultat
- ✅ Limitation à 200 caractères pour la requête
- ✅ Les commandes (/) sont ignorées

## 🔍 Exemples de recherches réelles

```
studio
Toyota
emploi
ménagère
terrain
appartement 3 chambres
voiture occasion
cherche chauffeur
location Libreville
maison à vendre
```

## 🐛 Erreurs à gérer

1. **Base de données vide** : Message d'aucun résultat
2. **Erreur de connexion DB** : Message d'erreur générique
3. **Requête invalide** : Recherche quand même (ILIKE est permissif)

## ✅ Validation finale

Avant le déploiement, vérifier :
- [ ] Au moins 10 annonces en base de données
- [ ] Le bot répond aux messages texte
- [ ] Les résultats sont pertinents
- [ ] Le formatage Markdown fonctionne
- [ ] Les commandes ne déclenchent pas la recherche
- [ ] Le message d'erreur s'affiche correctement
