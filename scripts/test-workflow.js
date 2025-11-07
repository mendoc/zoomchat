import fetch from 'node-fetch';

/**
 * Script de test qui simule le workflow Google Apps Script
 * Teste : POST /parution → POST /extract → POST /notify (auto)
 */

const SERVER_URL = 'http://localhost:8080';

// Données de test (simulant une vraie parution)
const TEST_PARUTION = {
  numero: '1547',
  periode: '07/11/2025 au 13/11/2025',
  pdfUrl: 'https://www.zoomhebdo.com/raw/vue_fil?id=601',
  dateParution: new Date().toISOString(),
};

async function testWorkflow() {
  console.log('🧪 Test du workflow complet\n');

  try {
    // 1. POST /parution (enregistrement)
    console.log('📝 Étape 1: Enregistrement de la parution...');
    const parutionResponse = await fetch(`${SERVER_URL}/parution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_PARUTION),
    });

    const parutionResult = await parutionResponse.json();

    if (!parutionResult.success) {
      throw new Error(`Échec enregistrement: ${parutionResult.error || 'Erreur inconnue'}`);
    }

    console.log(`✅ Parution enregistrée: ID ${parutionResult.parution.id}`);
    console.log(`   Numero: ${parutionResult.parution.numero}`);
    console.log(`   Période: ${parutionResult.parution.periode}`);
    console.log(`   Date: ${parutionResult.parution.dateParution}\n`);

    // 2. POST /extract (fire-and-forget simulation)
    console.log("🔍 Étape 2: Déclenchement de l'extraction...");
    console.log("⚠️  Note: L'extraction peut prendre plusieurs minutes.");
    console.log('    Le serveur appellera automatiquement POST /notify en cas de succès.\n');

    const extractResponse = await fetch(`${SERVER_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: TEST_PARUTION.numero,
        forceExtract: false,
      }),
    });

    const extractResult = await extractResponse.json();

    if (!extractResult.success) {
      throw new Error(`Échec extraction: ${extractResult.error || 'Erreur inconnue'}`);
    }

    console.log('✅ Extraction terminée avec succès !');
    console.log(`   Pages traitées: ${extractResult.stats.totalPages}`);
    console.log(`   Annonces extraites: ${extractResult.stats.totalExtrait}`);
    console.log(`   Annonces sauvegardées: ${extractResult.stats.totalSauvegarde}`);
    console.log(`   Embeddings générés: ${extractResult.stats.embeddingsGenerated || 0}`);
    console.log(`   Durée: ${(extractResult.stats.duration / 1000).toFixed(1)}s\n`);

    console.log('🎉 Workflow complet testé avec succès !');
    console.log('📤 Le serveur a automatiquement envoyé le PDF aux abonnés.');
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    throw error;
  }
}

// Exécuter le test
testWorkflow();
