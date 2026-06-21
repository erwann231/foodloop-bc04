
require('dotenv').config();
const stripeService = require('./src/services/stripe.service');

async function main() {
  console.log('--- 1. Création d\'un compte producteur test ---');
  const accountId = await stripeService.createProducerAccount({
    email: 'producteur.test@foodloop.io',
    firstName: 'Jean',
    lastName: 'Dupont',
  });
  console.log('✅ Compte producteur créé :', accountId);

  console.log('\n--- 2. Génération du lien d\'onboarding ---');
  const onboardingUrl = await stripeService.createOnboardingLink(accountId, {
    returnUrl: 'http://localhost:3000/onboarding-complete',
    refreshUrl: 'http://localhost:3000/onboarding-refresh',
  });
  console.log('✅ URL d\'onboarding (à ouvrir dans le navigateur) :');
  console.log(onboardingUrl);

  console.log('\n--- 3. Vérification du statut du compte (avant onboarding) ---');
  const status = await stripeService.getAccountStatus(accountId);
  console.log('✅ Statut :', status);
  console.log('   (payoutsEnabled restera false jusqu\'à ce que l\'onboarding ci-dessus soit terminé)');

  console.log('\n--- 4. Création d\'un paiement test avec split à 8% ---');
  console.log('   NOTE : ceci échouera probablement tant que le compte producteur ci-dessus');
  console.log('   n\'a pas terminé son onboarding (Stripe bloque les transferts vers les comptes incomplets).');
  try {
    const payment = await stripeService.createPaymentIntent({
      amount: 2000,
      producerAccountId: accountId,
      orderId: 'test-order-001',
    });
    console.log('✅ Intention de paiement créée :', payment);
  } catch (err) {
    console.log('⚠️  Paiement échoué (normal si l\'onboarding n\'est pas terminé) :', err.message);
  }
}

main().catch((err) => {
  console.error('❌ Erreur du script de test :', err.message);
});