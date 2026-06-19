'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi, productsApi } from '@/lib/api';

const STATUS_LABELS = {
    pending:   { label: 'En attente',     color: '#f59e0b', bg: '#fef3c7' },
    confirmed: { label: 'Confirmée',      color: '#3b82f6', bg: '#dbeafe' },
    preparing: { label: 'En préparation', color: '#8b5cf6', bg: '#ede9fe' },
    ready:     { label: 'Prête',          color: '#10b981', bg: '#d1fae5' },
    completed: { label: 'Récupérée',      color: '#6b7280', bg: '#f3f4f6' },
    cancelled: { label: 'Annulée',        color: '#ef4444', bg: '#fee2e2' },
};

export default function DashboardPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [activeSubscriptions, setActiveSubscriptions] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('orders');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('foodloop_user');
        if (!stored) return router.push('/auth/login');
        const u = JSON.parse(stored);
        if (u.role !== 'producer') return router.push('/products');
        setUser(u);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, productsRes, subsRes] = await Promise.all([
                ordersApi.getProducerOrders(),
                productsApi.getAll(),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/subscriptions/producer-count`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('foodloop_token')}` }
                }).then(r => r.ok ? r.json() : { count: 0 }),
            ]);
            setOrders(ordersRes.orders || []);
            setProducts(productsRes.products || []);
            setActiveSubscriptions(subsRes.count || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId, status) => {
        try {
            await ordersApi.updateStatus(orderId, status);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleAvailability = async (productId, currentStatus) => {
        try {
            await productsApi.update(productId, { is_available: !currentStatus });
            setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_available: !currentStatus } : p));
        } catch (err) {
            alert(err.message);
        }
    };

    const deleteProduct = async (productId, productName) => {
        if (!confirm(`Supprimer "${productName}" ? Cette action est irréversible.`)) return;
        try {
            await productsApi.delete(productId);
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (err) {
            alert(err.message);
        }
    };

    // Stats calculées
    const todayCA = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((acc, o) => acc + parseFloat(o.total_amount || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const availableProducts = products.filter(p => p.is_available).length;

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
            Chargement du dashboard...
        </div>
    );

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1rem' }}>

            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Mon espace producteur
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <Link href="/dashboard/products/new" style={{
                    background: 'var(--color-primary)', color: '#fff',
                    padding: '0.65rem 1.25rem', borderRadius: '8px',
                    fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem',
                }}>
                    + Nouveau produit
                </Link>
            </div>

            {/* Cartes stats */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Commandes du jour', value: orders.length, icon: '📦', color: '#dbeafe', textColor: '#1e40af' },
                    { label: 'En attente', value: pendingOrders, icon: '⏳', color: '#fef3c7', textColor: '#92400e' },
                    { label: 'CA du jour', value: `${todayCA.toFixed(2)} €`, icon: '💶', color: '#d1fae5', textColor: '#065f46' },
                    { label: 'Abonnés actifs', value: activeSubscriptions, icon: '🔄', color: '#ede9fe', textColor: '#5b21b6' },
                ].map(({ label, value, icon, color, textColor }) => (
                    <div key={label} style={{
                        background: '#fff', borderRadius: '12px', padding: '1.5rem',
                        boxShadow: 'var(--shadow)', borderLeft: `4px solid ${textColor}`,
                        display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div style={{ fontSize: '2rem', background: color, borderRadius: '10px', padding: '0.5rem' }}>
                            {icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: textColor }}>{value}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Onglets */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0' }}>
                {[
                    { key: 'orders', label: `Commandes (${orders.length})` },
                    { key: 'products', label: `Mes produits (${products.length})` },
                ].map(({ key, label }) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                        padding: '0.65rem 1.25rem', border: 'none', background: 'none',
                        fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                        color: activeTab === key ? 'var(--color-primary)' : 'var(--color-muted)',
                        borderBottom: activeTab === key ? '2px solid var(--color-primary)' : '2px solid transparent',
                        marginBottom: '-2px',
                    }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Onglet Commandes */}
            {activeTab === 'orders' && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
                    {orders.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                            <p>Aucune commande aujourd'hui.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                                {['Commande', 'Client', 'Montant', 'Statut', 'Action'].map(h => (
                                    <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {orders.map((order, i) => {
                                const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                                const nextStatus = {
                                    pending: 'confirmed', confirmed: 'preparing',
                                    preparing: 'ready',
                                }[order.status];

                                return (
                                    <tr key={order.id} style={{ borderBottom: i < orders.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                        <td style={{ padding: '0.9rem 1rem', fontFamily: 'Courier New', fontSize: '0.85rem', fontWeight: 600 }}>
                                            #{order.id.slice(0, 8).toUpperCase()}
                                        </td>
                                        <td style={{ padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
                                            {order.consumer_first_name} {order.consumer_last_name}
                                        </td>
                                        <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                            {parseFloat(order.total_amount).toFixed(2)} €
                                        </td>
                                        <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ background: s.bg, color: s.color, fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '99px' }}>
                          {s.label}
                        </span>
                                        </td>
                                        <td style={{ padding: '0.9rem 1rem' }}>
                                            {nextStatus && (
                                                <button onClick={() => updateStatus(order.id, nextStatus)} style={{
                                                    background: 'var(--color-primary)', color: '#fff',
                                                    border: 'none', borderRadius: '6px',
                                                    padding: '0.35rem 0.8rem', fontSize: '0.82rem',
                                                    fontWeight: 600, cursor: 'pointer',
                                                }}>
                                                    → {STATUS_LABELS[nextStatus]?.label}
                                                </button>
                                            )}
                                            {order.status === 'pending' && (
                                                <button onClick={() => updateStatus(order.id, 'cancelled')} style={{
                                                    background: 'none', color: '#ef4444',
                                                    border: '1px solid #ef4444', borderRadius: '6px',
                                                    padding: '0.35rem 0.8rem', fontSize: '0.82rem',
                                                    fontWeight: 600, cursor: 'pointer', marginLeft: '0.5rem',
                                                }}>
                                                    Annuler
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Onglet Produits */}
            {activeTab === 'products' && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: 'var(--shadow)', overflowX: 'auto' }}>
                    {products.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🌱</div>
                            <p>Aucun produit encore.</p>
                            <Link href="/dashboard/products/new" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                                Ajouter mon premier produit →
                            </Link>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid var(--color-border)' }}>
                                {['Produit', 'Prix', 'Stock', 'Catégorie', 'Disponible', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '0.9rem 1rem', textAlign: 'left', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {products.map((product, i) => (
                                <tr key={product.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{product.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>{product.description?.slice(0, 40)}...</div>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        {parseFloat(product.price).toFixed(2)} € / {product.unit}
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.9rem' }}>
                      <span style={{ color: product.stock_quantity < 5 ? '#ef4444' : 'var(--color-text)', fontWeight: product.stock_quantity < 5 ? 700 : 400 }}>
                        {product.stock_quantity}
                      </span>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                        {product.category}
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <button onClick={() => toggleAvailability(product.id, product.is_available)} style={{
                                            background: product.is_available ? '#d1fae5' : '#fee2e2',
                                            color: product.is_available ? '#065f46' : '#991b1b',
                                            border: 'none', borderRadius: '99px',
                                            padding: '0.3rem 0.8rem', fontSize: '0.8rem',
                                            fontWeight: 700, cursor: 'pointer',
                                        }}>
                                            {product.is_available ? '✓ Dispo' : '✗ Indispo'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '0.9rem 1rem' }}>
                                        <button onClick={() => deleteProduct(product.id, product.name)} style={{
                                            background: 'none', color: '#ef4444',
                                            border: '1px solid #ef4444', borderRadius: '6px',
                                            padding: '0.3rem 0.7rem', fontSize: '0.82rem',
                                            fontWeight: 600, cursor: 'pointer',
                                        }}>
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}