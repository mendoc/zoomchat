import 'dotenv/config';
import { getLatestParution } from '../src/database.js';
import { downloadAndSplitPDF } from '../src/pdfSplitter.js';
import { extractAllAnnonces, cleanAnnonce } from '../src/geminiExtractor.js';
import { saveAnnonce } from '../src/database.js';

/**
 * Test du workflow complet d'extraction
 */
async function testExtraction() {
  try {
    console.log('🚀 Test du workflow d\'extraction complet\n');

    // 1. Récupérer la dernière parution
    console.log('Étape 1: Récupération de la dernière parution...');
    const parution = await getLatestParution();

    if (!parution) {
      console.error('❌ Aucune parution trouvée en base de données');
      console.log('\nPour ajouter une parution de test, vous pouvez exécuter:');
      console.log('node addTestParution.js');
      process.exit(1);
    }

    console.log(`✅ Parution trouvée: N°${parution.numero} (${parution.periode})`);
    console.log(`   URL PDF: ${parution.pdf_url}`);
    console.log(`   ID: ${parution.id}\n`);

    // 2. Télécharger et découper le PDF
    console.log('Étape 2: Téléchargement et découpage du PDF...');
    const pages = await downloadAndSplitPDF(parution.pdf_url);
    console.log(`✅ ${pages.length} pages découpées\n`);

    // 3. Extraire les annonces
    console.log('Étape 3: Extraction des annonces avec Gemini...');
    const annoncesExtraites = await extractAllAnnonces(pages);
    console.log(`✅ ${annoncesExtraites.length} annonces extraites brutes\n`);

    // 4. Nettoyer et filtrer
    console.log('Étape 4: Nettoyage et filtrage...');
    const annoncesCleaned = annoncesExtraites
      .map(annonce => cleanAnnonce(annonce))
      .filter(annonce => annonce.reference);

    console.log(`✅ ${annoncesCleaned.length} annonces valides (avec référence)\n`);

    // 5. Sauvegarder en base de données
    console.log('Étape 5: Sauvegarde en base de données...');
    let saved = 0;
    let errors = 0;

    for (const annonce of annoncesCleaned) {
      try {
        await saveAnnonce({
          parutionId: parution.id,
          category: annonce.category,
          subcategory: annonce.subcategory,
          title: annonce.title,
          reference: annonce.reference,
          description: annonce.description,
          contact: annonce.contact,
          price: annonce.price,
          location: annonce.location
        });
        saved++;
      } catch (error) {
        console.error(`  ❌ Erreur sauvegarde ${annonce.reference}:`, error.message);
        errors++;
      }
    }

    console.log(`✅ ${saved} annonces sauvegardées en base de données\n`);

    // 6. Résumé
    console.log('📊 RÉSUMÉ FINAL:');
    console.log(`   - Parution: N°${parution.numero}`);
    console.log(`   - Pages traitées: ${pages.length}`);
    console.log(`   - Annonces extraites (brutes): ${annoncesExtraites.length}`);
    console.log(`   - Annonces filtrées (avec référence): ${annoncesCleaned.length}`);
    console.log(`   - Annonces sauvegardées: ${saved}`);
    console.log(`   - Erreurs: ${errors}`);

    // Afficher quelques exemples
    console.log('\n📋 Exemples d\'annonces sauvegardées:');
    annoncesCleaned.slice(0, 3).forEach((annonce, i) => {
      console.log(`\n--- Annonce ${i + 1} ---`);
      console.log(`Référence: ${annonce.reference}`);
      console.log(`Catégorie: ${annonce.category}${annonce.subcategory ? ' > ' + annonce.subcategory : ''}`);
      console.log(`Titre: ${annonce.title || 'N/A'}`);
      console.log(`Prix: ${annonce.price || 'N/A'}`);
      console.log(`Localisation: ${annonce.location || 'N/A'}`);
    });

    console.log('\n✅ Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testExtraction();
