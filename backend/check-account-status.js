// check-account-status.js
require('dotenv').config();
const stripeService = require('./src/services/stripe.service');

const accountId = process.argv[2];

if (!accountId) {
  console.error('❌ Merci de fournir un account ID, ex : node check-account-status.js acct_1TjwacDzU4VVJtSX');
  process.exit(1);
}

stripeService.getAccountStatus(accountId)
  .then((status) => {
    console.log(`Statut du compte ${accountId} :`, status);
    if (status.payoutsEnabled) {
      console.log('✅ Onboarding terminé — ce compte peut recevoir des paiements.');
    } else {
      console.log('⚠️  Onboarding pas encore terminé — retourne sur le lien d\'onboarding pour finir le formulaire.');
    }
  })
  .catch((err) => {
    console.error('❌ Erreur :', err.message);
  });