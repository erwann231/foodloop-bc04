'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Link from 'next/link';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// ── Formulaire de paiement ────────────────────────────────────────────────────
function CheckoutForm({ orderId, amount }) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setError('');

        try {
            // Confirmer le paiement via Stripe
            const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (stripeError) {
                setError(stripeError.message);
                return;
            }

            if (paymentIntent.status === 'succeeded') {
                // Confirmer côté backend
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/confirm`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('foodloop_token')}`,
                    },
                    body: JSON.stringify({
                        order_id: orderId,
                        payment_intent_id: paymentIntent.id,
                    }),
                });

                if (res.ok) {
                    router.push(`/orders/${orderId}?paid=true`);
                } else {
                    setError('Paiement confirmé mais erreur lors de la mise à jour. Contactez le support.');
                }
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <PaymentElement />

            {error && (
                <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: '8px', padding: '0.75rem 1rem',
                    color: '#991b1b', fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || loading}
                style={{
                    background: (!stripe || loading) ? '#9ca3af' : 'var(--color-primary)',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    padding: '0.85rem', fontSize: '1rem', fontWeight: 700,
                    cursor: (!stripe || loading) ? 'not-allowed' : 'pointer',
                }}
            >
                {loading ? 'Paiement en cours...' : `Payer ${(amount / 100).toFixed(2)} €`}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                🔒 Paiement sécurisé par Stripe — vos données sont chiffrées
            </p>
        </form>
    );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PaymentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const orderId = searchParams.get('order_id');

    const [clientSecret, setClientSecret] = useState('');
    const [amount, setAmount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user) return router.push('/auth/login');
        if (!orderId) return router.push('/orders');
        initPayment();
    }, [orderId]);

    const initPayment = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payments/create-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('foodloop_token')}`,
                },
                body: JSON.stringify({ order_id: orderId }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Erreur lors de l\'initialisation du paiement');
                return;
            }

            setClientSecret(data.clientSecret);
            setAmount(data.amount);
        } catch (err) {
            setError('Impossible de contacter le serveur de paiement');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
            Initialisation du paiement...
        </div>
    );

    if (error) return (
        <div style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
            <h2 style={{ color: '#991b1b', marginBottom: '0.5rem' }}>Erreur de paiement</h2>
            <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>{error}</p>
            <Link href="/orders" style={{
                background: 'var(--color-primary)', color: '#fff',
                padding: '0.75rem 2rem', borderRadius: '8px',
                fontWeight: 700, textDecoration: 'none',
            }}>
                Mes commandes
            </Link>
        </div>
    );

    return (
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem 1rem' }}>
            <Link href={`/orders/${orderId}`} style={{ color: 'var(--color-muted)', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.5rem' }}>
                ← Ma commande
            </Link>

            <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>💳</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Paiement
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Commande #{orderId?.slice(0, 8).toUpperCase()}
                    </p>
                </div>

                {clientSecret && (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: 'stripe',
                                variables: {
                                    colorPrimary: '#2D6A4F',
                                    borderRadius: '8px',
                                },
                            },
                        }}
                    >
                        <CheckoutForm orderId={orderId} amount={amount} />
                    </Elements>
                )}
            </div>
        </div>
    );
}