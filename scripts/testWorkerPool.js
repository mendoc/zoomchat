import 'dotenv/config';
import { getLatestParution } from './src/database.js';
import { downloadAndSplitPDF } from './src/pdfSplitter.js';
import { extractAllAnnonces, cleanAnnonce } from './src/geminiExtractor.js';
import { saveAnnonce } from './src/database.js';

/**
 * Test du pool de workers continu
 */
async function testWorkerPool() {
  const startTime = Date.now();

  try {
    console.log('🚀 Test du pool de workers continu\n');

    // 1. Récupérer la dernière parution
    console.log('Étape 1: Récupération de la dernière parution...');
    const parution = await getLatestParution();

    if (!parution) {
      console.error('❌ Aucune parution trouvée en base de données');
      process.exit(1);
    }

    console.log(`✅ Parution trouvée: N°${parution.numero} (${parution.periode})`);
    console.log(`   URL PDF: ${parution.pdf_url}`);
    console.log(`   ID: ${parution.id}\n`);

    // 2. Télécharger et découper le PDF
    console.log('Étape 2: Téléchargement et découpage du PDF...');
    const pages = await downloadAndSplitPDF(parution.pdf_url);
    console.log(`✅ ${pages.length} pages découpées\n`);

    // 3. Extraire les annonces avec le pool de workers
    console.log('Étape 3: Extraction avec pool de workers continu...');
    const extractionStart = Date.now();
    const annoncesExtraites = await extractAllAnnonces(pages);
    const extractionTime = ((Date.now() - extractionStart) / 1000).toFixed(1);
    console.log(`✅ ${annoncesExtraites.length} annonces extraites en ${extractionTime}s\n`);

    // 4. Nettoyer et filtrer
    console.log('Étape 4: Nettoyage et filtrage...');
    const annoncesCleaned = annoncesExtraites
      .map(annonce => cleanAnnonce(annonce))
      .filter(annonce => annonce.reference);

    console.log(`✅ ${annoncesCleaned.length} annonces valides (avec référence)\n`);

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

    // 5. Résumé
    console.log('📊 RÉSUMÉ FINAL:');
    console.log(`   - Temps total: ${totalTime}s`);
    console.log(`   - Temps extraction: ${extractionTime}s`);
    console.log(`   - Pages traitées: ${pages.length}`);
    console.log(`   - Annonces extraites: ${annoncesExtraites.length}`);
    console.log(`   - Annonces valides: ${annoncesCleaned.length}`);
    console.log(`   - Vitesse moyenne: ${(parseFloat(extractionTime) / pages.length).toFixed(1)}s/page`);

    console.log('\n✅ Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testWorkerPool();
