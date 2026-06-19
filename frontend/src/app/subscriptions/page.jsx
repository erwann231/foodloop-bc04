'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem('foodloop_token');
    const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        ...options,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur réseau' }));
        throw new Error(err.error);
    }
    return res.json();
};

export default function SubscriptionsPage() {
    const router = useRouter();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [products, setProducts] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user || user.role !== 'consumer') return router.push('/auth/login');
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [subsRes, productsRes] = await Promise.all([
                apiCall('/subscriptions/mine'),
                apiCall('/products'),
            ]);
            setSubscriptions(subsRes.subscriptions || []);
            setProducts(productsRes.products || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = (productId, qty) => {
        if (qty <= 0) {
            setSelectedItems(prev => prev.filter(i => i.product_id !== productId));
        } else {
            setSelectedItems(prev => {
                const existing = prev.find(i => i.product_id === productId);
                if (existing) return prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i);
                return [...prev, { product_id: productId, quantity: qty }];
            });
        }
    };

    const getQty = (productId) => selectedItems.find(i => i.product_id === productId)?.quantity || 0;

    const createSub = async () => {
        if (selectedItems.length === 0) return setError('Sélectionnez au moins un produit');
        setCreating(true);
        setError('');
        try {
            await apiCall('/subscriptions', { method: 'POST', body: JSON.stringify({ items: selectedItems }) });
            setShowForm(false);
            setSelectedItems([]);
            fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const toggleSub = async (id) => {
        try {
            const res = await apiCall(`/subscriptions/${id}/toggle`, { method: 'PATCH' });
            setSubscriptions(prev => prev.map(s => s.id === id ? { ...s, is_active: res.subscription.is_active } : s));
        } catch (err) {
            alert(err.message);
        }
    };

    const deleteSub = async (id) => {
        if (!confirm('Supprimer cet abonnement ?')) return;
        try {
            await apiCall(`/subscriptions/${id}`, { method: 'DELETE' });
            setSubscriptions(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>Chargement...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Mes abonnements
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                        Paniers hebdomadaires renouvelés automatiquement chaque lundi
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={{
                    background: 'var(--color-primary)', color: '#fff', border: 'none',
                    borderRadius: '8px', padding: '0.65rem 1.25rem',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem',
                }}>
                    + Nouvel abonnement
                </button>
            </div>

            {/* Formulaire création */}
            {showForm && (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '1rem' }}>
                        Composer mon panier hebdomadaire
                    </h2>

                    {error && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem', color: '#991b1b', fontSize: '0.9rem', marginBottom: '1rem' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
                        {products.map(product => (
                            <div key={product.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.6rem 0.8rem', borderRadius: '8px',
                                background: getQty(product.id) > 0 ? '#f0faf4' : '#f9fafb',
                                border: `1px solid ${getQty(product.id) > 0 ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{product.name}</span>
                                    <span style={{ color: 'var(--color-muted)', fontSize: '0.82rem', marginLeft: '0.5rem' }}>
                    {parseFloat(product.price).toFixed(2)} € / {product.unit}
                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button onClick={() => updateQuantity(product.id, getQty(product.id) - 1)}
                                            style={{ width: '28px', height: '28px', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                                        −
                                    </button>
                                    <span style={{ fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{getQty(product.id)}</span>
                                    <button onClick={() => updateQuantity(product.id, getQty(product.id) + 1)}
                                            style={{ width: '28px', height: '28px', border: '1px solid var(--color-border)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                                        +
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={createSub} disabled={creating} style={{
                            flex: 1, background: creating ? '#9ca3af' : 'var(--color-primary)',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            padding: '0.75rem', fontWeight: 700, cursor: creating ? 'not-allowed' : 'pointer',
                        }}>
                            {creating ? 'Création...' : `S'abonner (${selectedItems.length} produit${selectedItems.length > 1 ? 's' : ''})`}
                        </button>
                        <button onClick={() => { setShowForm(false); setSelectedItems([]); setError(''); }} style={{
                            padding: '0.75rem 1.5rem', border: '1px solid var(--color-border)',
                            borderRadius: '8px', background: '#fff', cursor: 'pointer', color: 'var(--color-muted)',
                        }}>
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Liste abonnements */}
            {subscriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem', marginBottom: '1rem' }}>
                        Aucun abonnement actif.
                    </p>
                    <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                        Créez un panier hebdomadaire et recevez vos produits frais chaque semaine automatiquement.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {subscriptions.map(sub => (
                        <div key={sub.id} style={{
                            background: '#fff', borderRadius: '12px', padding: '1.25rem',
                            boxShadow: 'var(--shadow)',
                            borderLeft: `4px solid ${sub.is_active ? 'var(--color-primary)' : '#9ca3af'}`,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontWeight: 700 }}>Abonnement #{sub.id.slice(0, 8).toUpperCase()}</span>
                                        <span style={{
                                            background: sub.is_active ? '#d1fae5' : '#f3f4f6',
                                            color: sub.is_active ? '#065f46' : '#6b7280',
                                            fontSize: '0.75rem', fontWeight: 700,
                                            padding: '0.2rem 0.6rem', borderRadius: '99px',
                                        }}>
                      {sub.is_active ? '✓ Actif' : '⏸ Suspendu'}
                    </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                                        Prochain renouvellement : {sub.next_order_date ? new Date(sub.next_order_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Non défini'}
                                        {sub.hub_name && ` · ${sub.hub_name}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => toggleSub(sub.id)} style={{
                                        background: sub.is_active ? '#fef3c7' : '#d1fae5',
                                        color: sub.is_active ? '#92400e' : '#065f46',
                                        border: 'none', borderRadius: '6px',
                                        padding: '0.4rem 0.8rem', fontSize: '0.82rem',
                                        fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        {sub.is_active ? '⏸ Suspendre' : '▶ Reprendre'}
                                    </button>
                                    <button onClick={() => deleteSub(sub.id)} style={{
                                        background: 'none', color: '#ef4444',
                                        border: '1px solid #ef4444', borderRadius: '6px',
                                        padding: '0.4rem 0.8rem', fontSize: '0.82rem',
                                        fontWeight: 600, cursor: 'pointer',
                                    }}>
                                        Supprimer
                                    </button>
                                </div>
                            </div>

                            {/* Articles */}
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {sub.items?.map((item, i) => (
                                    <span key={i} style={{
                                        background: '#f0faf4', color: 'var(--color-primary)',
                                        padding: '0.25rem 0.75rem', borderRadius: '99px',
                                        fontSize: '0.82rem', fontWeight: 600,
                                    }}>
                    {item.quantity}× {item.product_name || 'Produit'}
                  </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}