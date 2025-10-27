import 'dotenv/config';
import { getLatestParution, saveAnnonce, initDatabase } from '../src/database.js';
import { processPDF } from '../src/pdfParser.js';

/**
 * Script de test pour extraire les annonces du PDF
 */
export async function testExtraction() {
  try {
    console.log('🚀 Démarrage du test d\'extraction...\n');

    // Initialiser la base de données
    await initDatabase();

    // Récupérer la dernière parution
    console.log('📥 Récupération de la dernière parution...');
    const parution = await getLatestParution();

    if (!parution) {
      console.log('❌ Aucune parution trouvée en base de données');
      console.log('💡 Astuce: Ajoutez une parution via Code.gs ou manuellement en base');
      process.exit(1);
    }

    console.log(`✅ Parution trouvée: N°${parution.numero} - ${parution.periode}`);
    console.log(`📄 URL du PDF: ${parution.pdf_url}\n`);

    // Traiter le PDF
    console.log('🔄 Traitement du PDF en cours...\n');
    const annonces = await processPDF(parution.pdf_url);

    console.log(`\n📊 Résumé:`);
    console.log(`   - ${annonces.length} annonces extraites`);

    // Sauvegarder quelques annonces en base (limité à 10 pour le test)
    console.log('\n💾 Sauvegarde des annonces en base de données...');
    const toSave = annonces.slice(0, 10);

    for (const annonce of toSave) {
      await saveAnnonce({
        parutionId: parution.id,
        categorie: annonce.categorie,
        titre: annonce.titre,
        reference: annonce.reference,
        description: annonce.description,
        telephone: annonce.telephone,
        prix: annonce.prix,
        localisation: annonce.localisation,
        type_bien_service: annonce.type_bien_service,
        email: annonce.email
      });
    }

    console.log(`\n✅ ${toSave.length} annonces sauvegardées avec succès !`);
    console.log('\n📝 Exemples d\'annonces extraites:');

    toSave.slice(0, 3).forEach((annonce, index) => {
      console.log(`\n   ${index + 1}. [${annonce.categorie}] ${annonce.titre || 'Sans titre'}`);
      console.log(`      Réf: ${annonce.reference || 'N/A'}`);
      console.log(`      Desc: ${annonce.description?.substring(0, 80)}...`);
      console.log(`      Tel: ${annonce.telephone || 'N/A'}`);
      console.log(`      Prix: ${annonce.prix || 'N/A'}`);
      console.log(`      Lieu: ${annonce.localisation || 'N/A'}`);
      console.log(`      Type: ${annonce.type_bien_service || 'N/A'}`);
    });

    console.log('\n✅ Test terminé avec succès !');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

// Lancer le test
testExtraction();
