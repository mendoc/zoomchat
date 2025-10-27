import 'dotenv/config';
import { downloadAndSplitPDF } from '../src/pdfSplitter.js';
import { extractAllAnnonces, cleanAnnonce } from '../src/geminiExtractor.js';
import fs from 'fs';

/**
 * Script de test pour la nouvelle extraction Gemini
 * Usage: node testNewExtractor.js <pdf_url>
 */

async function main() {
  const pdfUrl = process.argv[2];

  if (!pdfUrl) {
    console.error('Usage: node testNewExtractor.js <pdf_url>');
    console.error('Exemple: node testNewExtractor.js https://example.com/zoom1544.pdf');
    process.exit(1);
  }

  console.log('🚀 Test de la nouvelle extraction Gemini\n');
  console.log(`📄 URL du PDF: ${pdfUrl}\n`);

  try {
    // 1. Télécharger et découper le PDF
    console.log('Étape 1: Téléchargement et découpage du PDF...');
    const pages = await downloadAndSplitPDF(pdfUrl);
    console.log(`✅ ${pages.length} pages découpées\n`);

    // 2. Extraire les annonces
    console.log('Étape 2: Extraction des annonces avec Gemini...');
    const annoncesExtraites = await extractAllAnnonces(pages);
    console.log(`✅ ${annoncesExtraites.length} annonces extraites brutes\n`);

    // 3. Nettoyer et filtrer
    console.log('Étape 3: Nettoyage et filtrage...');
    const annoncesCleaned = annoncesExtraites
      .map(annonce => cleanAnnonce(annonce))
      .filter(annonce => annonce.reference);

    console.log(`✅ ${annoncesCleaned.length} annonces valides (avec référence)\n`);

    // 4. Afficher quelques exemples
    console.log('📋 Exemples d\'annonces extraites:\n');
    annoncesCleaned.slice(0, 3).forEach((annonce, i) => {
      console.log(`--- Annonce ${i + 1} ---`);
      console.log(`Catégorie: ${annonce.category}`);
      console.log(`Sous-catégorie: ${annonce.subcategory || 'N/A'}`);
      console.log(`Titre: ${annonce.title}`);
      console.log(`Référence: ${annonce.reference}`);
      console.log(`Prix: ${annonce.price || 'N/A'}`);
      console.log(`Localisation: ${annonce.location || 'N/A'}`);
      console.log(`Description: ${annonce.description.substring(0, 100)}...`);
      console.log('');
    });

    // 5. Sauvegarder dans un fichier JSON
    const outputFile = 'test_extraction_result.json';
    fs.writeFileSync(outputFile, JSON.stringify(annoncesCleaned, null, 2), 'utf-8');
    console.log(`💾 Résultats sauvegardés dans ${outputFile}\n`);

    // 6. Statistiques finales
    console.log('📊 STATISTIQUES FINALES:');
    console.log(`   - Pages traitées: ${pages.length}`);
    console.log(`   - Annonces extraites (brutes): ${annoncesExtraites.length}`);
    console.log(`   - Annonces valides (avec référence): ${annoncesCleaned.length}`);
    console.log(`   - Taux de succès: ${((annoncesCleaned.length / annoncesExtraites.length) * 100).toFixed(1)}%`);

    // Afficher la répartition par catégorie
    const categories = {};
    annoncesCleaned.forEach(a => {
      categories[a.category] = (categories[a.category] || 0) + 1;
    });
    console.log('\n   Répartition par catégorie:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count}`);
    });

    console.log('\n✅ Test terminé avec succès !');

  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    process.exit(1);
  }
}

main();
