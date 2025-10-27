import 'dotenv/config';
import { searchAnnonces } from '../src/database.js';

async function debug() {
  try {
    console.log('🔍 Recherche d\'annonces pour "Maison"...\n');

    const resultats = await searchAnnonces('Maison', 5);

    console.log(`Nombre de résultats : ${resultats.length}\n`);

    resultats.forEach((annonce, index) => {
      console.log(`\n=== Annonce ${index + 1} ===`);
      console.log('ID:', annonce.id);
      console.log('Catégorie:', annonce.categorie);
      console.log('Titre:', annonce.titre);
      console.log('Description:', annonce.description ? annonce.description.substring(0, 50) + '...' : null);
      console.log('Type:', annonce.type_bien_service);
      console.log('Localisation:', annonce.localisation);
      console.log('Prix:', annonce.prix);
      console.log('Téléphone:', annonce.telephone);
      console.log('Référence:', annonce.reference);
      console.log('Tous les champs:', Object.keys(annonce));
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

debug();
