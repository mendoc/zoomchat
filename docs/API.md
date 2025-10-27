# API Documentation - ZoomChat

## 📌 Endpoints disponibles

### 1. POST /extract - Extraction des annonces

**Description** : Extrait et sauvegarde toutes les annonces de la dernière parution PDF enregistrée en base de données.

**Utilisé par** : Google Apps Script (Code.gs) après l'enregistrement d'une nouvelle parution.

**Méthode** : `POST`

**URL** : `https://[cloud-run-url]/extract`

**Body** : Aucun (optionnel)

**Réponse réussie** :
```json
{
  "success": true,
  "parution": {
    "numero": "1545",
    "periode": "24/10/2025 au 30/10/2025"
  },
  "stats": {
    "extraites": 195,
    "sauvegardees": 195
  }
}
```

**Réponse erreur** :
```json
{
  "success": false,
  "error": "Aucune parution trouvée en base de données"
}
```

**Exemple d'appel (curl)** :
```bash
curl -X POST https://[cloud-run-url]/extract \
  -H "Content-Type: application/json"
```

**Exemple d'appel (Apps Script)** :
```javascript
// Dans Code.gs, après avoir sauvegardé la parution
function triggerExtraction() {
  const url = 'https://[cloud-run-url]/extract';

  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(url, options);
  const result = JSON.parse(response.getContentText());

  Logger.log('Extraction: ' + result.stats.sauvegardees + ' annonces sauvegardées');
}
```

---

### 2. GET /search - Recherche d'annonces

**Description** : Recherche des annonces par mots-clés dans le texte complet.

**Méthode** : `GET`

**URL** : `https://[cloud-run-url]/search`

**Paramètres** :
- `q` (requis) : Requête de recherche
- `limit` (optionnel) : Nombre maximum de résultats (défaut: 10)

**Exemples d'URL** :
```
GET /search?q=studio
GET /search?q=libreville&limit=5
GET /search?q=toyota
GET /search?q=emploi+chauffeur
```

**Réponse réussie** :
```json
{
  "resultats": [
    {
      "id": 123,
      "parution_id": 45,
      "categorie": "Immobilier",
      "texte_complet": "STUDIO À COSYGA chambre, grande cuisine, grande douche/wc...",
      "telephone": "066 04 15 20",
      "prix": "110 000 FCFA",
      "created_at": "2025-10-26T12:00:00.000Z"
    }
  ],
  "total": 1,
  "query": "studio"
}
```

**Réponse erreur** :
```json
{
  "error": "Paramètre \"q\" manquant"
}
```

**Exemple d'appel (curl)** :
```bash
curl "https://[cloud-run-url]/search?q=studio&limit=5"
```

**Exemple d'appel (JavaScript)** :
```javascript
fetch('https://[cloud-run-url]/search?q=studio&limit=5')
  .then(response => response.json())
  .then(data => {
    console.log(`${data.total} annonces trouvées`);
    data.resultats.forEach(annonce => {
      console.log(`${annonce.categorie}: ${annonce.texte_complet.substring(0, 100)}...`);
    });
  });
```

---

## 🔄 Workflow complet

1. **Réception du PDF** (Code.gs)
   - Nouveau email de Zoom Hebdo reçu
   - Code.gs extrait l'URL du PDF
   - Sauvegarde dans la table `parutions`

2. **Extraction automatique** (Code.gs → Cloud Run)
   - Code.gs appelle `POST /extract`
   - Cloud Run récupère la dernière parution
   - Télécharge et parse le PDF
   - Sauvegarde ~200 annonces dans la table `annonces`

3. **Recherche** (Utilisateur → Cloud Run)
   - L'utilisateur appelle `GET /search?q=...`
   - Recherche dans les annonces sauvegardées
   - Retourne les résultats

---

## 🗄️ Structure de la base de données

### Table `annonces`
```sql
id               SERIAL PRIMARY KEY
parution_id      INTEGER (FK vers parutions)
categorie        TEXT
texte_complet    TEXT
telephone        TEXT
prix             TEXT
created_at       TIMESTAMP
```

### Catégories détectées
- Emploi
- Véhicule
- Immobilier
- Objet
- People
- Autre

---

## 🚀 Notes de déploiement

Pour que les endpoints fonctionnent en production sur Cloud Run :

1. Déployer avec les bonnes variables d'environnement
2. La route `/extract` sera appelée par Apps Script
3. La route `/search` peut être utilisée par n'importe quelle application cliente
