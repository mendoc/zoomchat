# Extraction d'annonces via LLM (GPT-4o-mini)

## 📋 Vue d'ensemble

Le système utilise GPT-4o-mini (OpenAI Vision API) pour extraire intelligemment les annonces des PDF Zoom Hebdo. Cette approche offre une précision supérieure aux méthodes basées sur regex, notamment pour :
- Gérer les layouts multi-colonnes
- Filtrer automatiquement les pages sans annonces
- Extraire tous les champs structurés

## 🔑 Configuration

### 1. Obtenir une clé API OpenAI

1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/)
2. Allez dans [API Keys](https://platform.openai.com/api-keys)
3. Créez une nouvelle clé API
4. Ajoutez des crédits (minimum $5) dans [Billing](https://platform.openai.com/settings/organization/billing/overview)

### 2. Configurer la variable d'environnement

Ajoutez votre clé API dans le fichier `.env` :

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

## 💰 Coûts

- **Modèle** : GPT-4o-mini
- **Prix** : ~$0.15 / 1M tokens input, ~$0.60 / 1M tokens output
- **Coût par PDF** : ~$0.005 (0.5 centime) pour un PDF de 10 pages
- **Très économique** pour un usage régulier

## 🧪 Tester l'extraction

Lancez le script de test avec un PDF exemple :

```bash
node testExtraction.js
```

Le script va :
1. Télécharger le PDF depuis la base de données
2. Convertir chaque page en image
3. Analyser chaque page avec GPT-4o-mini
4. Extraire toutes les annonces structurées
5. Sauvegarder les résultats en base

## 📊 Structure des données extraites

Chaque annonce contient :
- **categorie** : Emploi, Véhicule, Immobilier, Objet, People, etc.
- **titre** : Titre principal (ex: "VEND RENAULT DUSTER")
- **reference** : Code unique (ex: "GA001 251016 E0004")
- **description** : Texte complet de l'annonce
- **telephone** : Numéro(s) de contact
- **prix** : Prix mentionné (ex: "3 800 000 FCFA")
- **localisation** : Ville/quartier (Libreville, Owendo, etc.)
- **type_bien_service** : Type précis (Studio, Villa, Toyota, etc.)
- **email** : Adresse email si présente

## 🛠️ Architecture technique

### Pipeline d'extraction

```
PDF URL
  ↓
[downloadPDF] → ArrayBuffer
  ↓
[convertPDFToImages] → Array<base64 PNG>
  ↓
[extractAllAnnonces] → Pour chaque page:
  ↓                     - Envoi image à GPT-4o-mini
  |                     - Analyse visuelle du layout
  |                     - Détection annonces vs pub/agenda
  |                     - Extraction JSON structuré
  ↓
[cleanAnnonce] → Validation et normalisation
  ↓
Array<Annonce> → Sauvegarde en base
```

### Modules

- **src/llmExtractor.js** : Logique d'extraction via GPT-4o-mini
- **src/pdfParser.js** : Conversion PDF et orchestration
- **src/database.js** : Sauvegarde en base PostgreSQL

## ⚡ Optimisations

- **Traitement séquentiel** : Pages traitées une par une pour respecter les rate limits
- **Pause entre requêtes** : 500ms entre chaque page
- **Filtrage intelligent** : Le LLM identifie et ignore les pages sans annonces
- **Haute résolution** : Images en 2000×2828px pour une bonne lisibilité

## 🔍 Prompt LLM

Le prompt système guide le LLM pour :
- Reconstituer les annonces multi-colonnes
- Identifier la référence unique de fin d'annonce
- Extraire tous les champs structurés
- Filtrer les pages de couverture/agenda/publicités
- Retourner du JSON valide

## 📝 Exemple de résultat

```json
{
  "has_annonces": true,
  "annonces": [
    {
      "categorie": "Véhicule",
      "titre": "VEND RENAULT DUSTER",
      "reference": "GA001 251014 E0004",
      "description": "bon état général - Prix : 3 800 000 FCFA à débattre",
      "telephone": "074 57 23 36",
      "prix": "3 800 000 FCFA",
      "localisation": null,
      "type_bien_service": "Renault Duster",
      "email": null
    }
  ]
}
```

## 🐛 Dépannage

### Erreur "Missing API Key"
→ Vérifiez que `OPENAI_API_KEY` est bien défini dans `.env`

### Erreur "Insufficient credits"
→ Ajoutez des crédits sur votre compte OpenAI

### Erreur "Rate limit"
→ Le script attend déjà 500ms entre requêtes, augmentez ce délai dans `llmExtractor.js` si nécessaire

### Pas d'annonces extraites
→ Vérifiez que le PDF contient bien des annonces et que les images sont lisibles
