'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';

export default function CartPage() {
    const router = useRouter();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('foodloop_cart');
        if (stored) setCart(JSON.parse(stored));
    }, []);

    const updateQuantity = (id, qty) => {
        if (qty <= 0) return removeItem(id);
        const updated = cart.map(i => i.id === id ? { ...i, quantity: qty } : i);
        setCart(updated);
        localStorage.setItem('foodloop_cart', JSON.stringify(updated));
    };

    const removeItem = (id) => {
        const updated = cart.filter(i => i.id !== id);
        setCart(updated);
        localStorage.setItem('foodloop_cart', JSON.stringify(updated));
    };

    const total = cart.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);
    const commission = total * 0.08;

    const handleOrder = async () => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user) return router.push('/auth/login');

        setLoading(true);
        setError('');

        try {
            const items = cart.map(i => ({ product_id: i.id, quantity: i.quantity }));
            const { order } = await ordersApi.create({ items });
            localStorage.removeItem('foodloop_cart');
            router.push(`/orders/${order.id}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (cart.length === 0) return (
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
            <h2 style={{ color: 'var(--color-primary)', fontWeight: 800 }}>Votre panier est vide</h2>
            <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>
                Découvrez nos produits locaux et ajoutez-en à votre panier.
            </p>
            <Link href="/products" style={{
                background: 'var(--color-primary)', color: '#fff',
                padding: '0.75rem 2rem', borderRadius: '8px',
                fontWeight: 700, textDecoration: 'none',
            }}>
                Voir les produits
            </Link>
        </div>
    );

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                Mon panier
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Liste des articles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {cart.map(item => (
                        <div key={item.id} style={{
                            background: '#fff', borderRadius: '12px',
                            padding: '1rem 1.25rem', boxShadow: 'var(--shadow)',
                            display: 'flex', alignItems: 'center', gap: '1rem',
                        }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '8px',
                                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.75rem', flexShrink: 0,
                            }}>
                                🌿
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.name}</div>
                                <div style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}>{item.farm_name}</div>
                                <div style={{ color: 'var(--color-primary)', fontWeight: 700, marginTop: '0.2rem' }}>
                                    {parseFloat(item.price).toFixed(2)} € / {item.unit}
                                </div>
                            </div>

                            {/* Contrôle quantité */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                        style={{ width: '30px', height: '30px', border: '1.5px solid var(--color-border)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}>
                                    −
                                </button>
                                <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                        style={{ width: '30px', height: '30px', border: '1.5px solid var(--color-border)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '1rem', fontWeight: 700 }}>
                                    +
                                </button>
                            </div>

                            <div style={{ fontWeight: 800, fontSize: '1rem', minWidth: '70px', textAlign: 'right' }}>
                                {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                            </div>

                            <button onClick={() => removeItem(item.id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#ef4444', padding: '0.25rem' }}>
                                ✕
                            </button>
                        </div>
                    ))}
                </div>

                {/* Récapitulatif */}
                <div style={{
                    background: '#fff', borderRadius: '12px',
                    padding: '1.5rem', boxShadow: 'var(--shadow)',
                    position: 'sticky', top: '80px',
                }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--color-text)' }}>
                        Récapitulatif
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                            <span>Sous-total</span>
                            <span>{total.toFixed(2)} €</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                            <span>Commission FoodLoop (8%)</span>
                            <span>{commission.toFixed(2)} €</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-text)' }}>
                            <span>Total</span>
                            <span style={{ color: 'var(--color-primary)' }}>{(total + commission).toFixed(2)} €</span>
                        </div>
                    </div>

                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleOrder}
                        disabled={loading}
                        style={{
                            width: '100%', background: loading ? '#9ca3af' : 'var(--color-primary)',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '0.85rem', fontSize: '1rem', fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? 'Commande en cours...' : 'Commander'}
                    </button>

                    <Link href="/products" style={{
                        display: 'block', textAlign: 'center', marginTop: '0.75rem',
                        color: 'var(--color-muted)', fontSize: '0.85rem', textDecoration: 'none',
                    }}>
                        ← Continuer mes achats
                    </Link>
                </div>
            </div>
        </div>
    );
}