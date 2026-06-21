// stripe.service.js
// Membre 2 — Intégration Stripe Connect
// Gère : PaymentIntent, split producteur/plateforme (8%), webhooks, remboursements

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLATFORM_FEE_PERCENT = 0.08; // 8% commission FoodLoop

// ─────────────────────────────────────────────
// 1. Créer un PaymentIntent avec split automatique
//    amount       : total en centimes (ex: 950 pour 9,50€)
//    producerAccountId : Stripe Connect account ID du producteur
//    orderId      : UUID de la commande (pour les métadonnées)
// ─────────────────────────────────────────────
async function createPaymentIntent({ amount, producerAccountId, orderId, customerId = null }) {
  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);

  const params = {
    amount,                    // montant total en centimes
    currency: 'eur',
    payment_method_types: ['card'],
    application_fee_amount: platformFee, // 8% reste sur le compte plateforme
    transfer_data: {
      destination: producerAccountId,    // le reste va au producteur
    },
    metadata: {
      order_id: orderId,
      platform_fee: platformFee,
    },
  };

  // Attacher le customer Stripe si disponible (utile pour l'abonnement F08)
  if (customerId) {
    params.customer = customerId;
  }

  const paymentIntent = await stripe.paymentIntents.create(params);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    platformFee,
    producerAmount: amount - platformFee,
  };
}

// ─────────────────────────────────────────────
// 2. Créer un compte Stripe Connect pour un producteur (onboarding)
// ─────────────────────────────────────────────
async function createProducerAccount({ email, firstName, lastName }) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: firstName,
      last_name: lastName,
      email,
    },
  });

  return account.id;
}

// Générer un lien d'onboarding pour le producteur
async function createOnboardingLink(stripeAccountId, { returnUrl, refreshUrl }) {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

// ─────────────────────────────────────────────
// 3. Remboursement d'une commande
// ─────────────────────────────────────────────
async function refundPayment(paymentIntentId, { amount = null, reason = 'requested_by_customer' } = {}) {
  const refundParams = {
    payment_intent: paymentIntentId,
    reason,
    refund_application_fee: true,   // rembourse aussi la commission plateforme
    reverse_transfer: true,         // rembourse le producteur
  };

  if (amount) {
    refundParams.amount = amount; // remboursement partiel si précisé
  }

  const refund = await stripe.refunds.create(refundParams);
  return refund;
}

// ─────────────────────────────────────────────
// 4. Vérifier la signature du webhook Stripe
// ─────────────────────────────────────────────
function constructWebhookEvent(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
}

// ─────────────────────────────────────────────
// 5. Créer/récupérer un customer Stripe (pour l'abonnement F08)
// ─────────────────────────────────────────────
async function getOrCreateCustomer({ email, userId, name }) {
  // Cherche si le customer existe déjà (par metadata user_id)
  const existing = await stripe.customers.search({
    query: `metadata['user_id']:'${userId}'`,
  });

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { user_id: userId },
  });

  return customer.id;
}

// ─────────────────────────────────────────────
// 6. Abonnement hebdomadaire (F08)
//    Crée un SetupIntent pour sauvegarder la CB sans débit immédiat.
//    Le débit réel est déclenché manuellement chaque semaine (voir subscription.service.js).
// ─────────────────────────────────────────────
async function createSetupIntent(stripeCustomerId) {
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    usage: 'off_session', // permet les débits futurs sans présence du client
  });

  return {
    clientSecret: setupIntent.client_secret,
    setupIntentId: setupIntent.id,
  };
}

// Charger le moyen de paiement sauvegardé (débit hors-session pour l'abonnement)
async function chargeSubscriptionBasket({ stripeCustomerId, amount, producerAccountId, subscriptionId }) {
  // Récupérer le moyen de paiement par défaut du customer
  const customer = await stripe.customers.retrieve(stripeCustomerId);
  const paymentMethodId = customer.invoice_settings?.default_payment_method;

  if (!paymentMethodId) {
    throw new Error('Aucun moyen de paiement sauvegardé pour ce client');
  }

  const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'eur',
    customer: stripeCustomerId,
    payment_method: paymentMethodId,
    confirm: true,                    // débit immédiat
    off_session: true,                // pas de redirection 3DS
    application_fee_amount: platformFee,
    transfer_data: { destination: producerAccountId },
    metadata: {
      subscription_id: subscriptionId,
      type: 'weekly_basket',
    },
  });

  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
    platformFee,
  };
}

// Récupérer le statut d'un compte Stripe Connect (onboarding terminé ? payouts actifs ?)
async function getAccountStatus(stripeAccountId) {
  const account = await stripe.accounts.retrieve(stripeAccountId);
  return {
    payoutsEnabled: account.payouts_enabled,
    chargesEnabled: account.charges_enabled,
    detailsSubmitted: account.details_submitted,
  };
}

module.exports = {
  createPaymentIntent,
  createProducerAccount,
  createOnboardingLink,
  refundPayment,
  constructWebhookEvent,
  getOrCreateCustomer,
  createSetupIntent,
  chargeSubscriptionBasket,
  getAccountStatus,
};
