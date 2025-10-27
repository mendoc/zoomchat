import 'dotenv/config';
import { createBot, notifyExtractionAdmin } from '../src/bot.js';

/**
 * Test de la notification admin après extraction
 */
async function testNotification() {
  try {
    console.log('🧪 Test de la notification admin\n');

    // Vérifier que ADMIN_CHAT_ID est configuré
    if (!process.env.ADMIN_CHAT_ID) {
      console.error('❌ ADMIN_CHAT_ID non configuré dans .env');
      console.log('   Ajoutez ADMIN_CHAT_ID=votre_chat_id dans votre fichier .env');
      process.exit(1);
    }

    console.log(`✅ ADMIN_CHAT_ID configuré: ${process.env.ADMIN_CHAT_ID}\n`);

    // Créer le bot
    const bot = createBot(process.env.TELEGRAM_BOT_TOKEN);

    // Simuler des données d'extraction (SUCCÈS COMPLET)
    console.log('📨 Test 1: Notification de SUCCÈS COMPLET...');
    await notifyExtractionAdmin(
      bot,
      {
        numero: '1545',
        periode: '24/10/2025 au 30/10/2025'
      },
      {
        totalPages: 5,
        pagesSuccess: 5,
        pagesErrors: 0,
        totalAnnonces: 184,
        errors: [],
        pageDetails: [
          { pageNumber: 1, annoncesCount: 7, duration: 25, status: 'success' },
          { pageNumber: 3, annoncesCount: 24, duration: 45, status: 'success' },
          { pageNumber: 5, annoncesCount: 61, duration: 60, status: 'success' },
          { pageNumber: 6, annoncesCount: 62, duration: 58, status: 'success' },
          { pageNumber: 7, annoncesCount: 30, duration: 40, status: 'success' }
        ]
      },
      192000, // 3min 12s
      180,
      0
    );
    console.log('✅ Notification de succès envoyée\n');

    // Attendre 2 secondes
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simuler des données d'extraction (SUCCÈS PARTIEL avec erreurs)
    console.log('📨 Test 2: Notification de SUCCÈS PARTIEL...');
    await notifyExtractionAdmin(
      bot,
      {
        numero: '1545',
        periode: '24/10/2025 au 30/10/2025'
      },
      {
        totalPages: 5,
        pagesSuccess: 3,
        pagesErrors: 2,
        totalAnnonces: 91,
        errors: [
          { pageNumber: 6, error: 'Model overloaded - retry limit exceeded' },
          { pageNumber: 7, error: 'Network timeout after 120s' }
        ],
        pageDetails: [
          { pageNumber: 1, annoncesCount: 7, duration: 25, status: 'success' },
          { pageNumber: 3, annoncesCount: 24, duration: 45, status: 'success' },
          { pageNumber: 5, annoncesCount: 60, duration: 60, status: 'success' },
          { pageNumber: 6, annoncesCount: 0, duration: 120, status: 'error', error: 'Model overloaded' },
          { pageNumber: 7, annoncesCount: 0, duration: 120, status: 'error', error: 'Network timeout' }
        ]
      },
      165000, // 2min 45s
      88,
      3
    );
    console.log('✅ Notification d\'erreur partielle envoyée\n');

    console.log('🎉 Tests de notification terminés avec succès !');
    console.log('\nVérifiez vos messages Telegram pour voir les notifications.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors du test:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

testNotification();
