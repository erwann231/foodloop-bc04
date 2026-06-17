'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api';

const STATUS_LABELS = {
    pending:   { label: 'En attente',    color: '#f59e0b', bg: '#fef3c7' },
    confirmed: { label: 'Confirmée',     color: '#3b82f6', bg: '#dbeafe' },
    preparing: { label: 'En préparation',color: '#8b5cf6', bg: '#ede9fe' },
    ready:     { label: 'Prête',         color: '#10b981', bg: '#d1fae5' },
    completed: { label: 'Récupérée',     color: '#6b7280', bg: '#f3f4f6' },
    cancelled: { label: 'Annulée',       color: '#ef4444', bg: '#fee2e2' },
};

export default function OrdersPage() {
    const router = useRouter();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user) return router.push('/auth/login');
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { orders } = await ordersApi.getMine();
            setOrders(orders);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
            Chargement de vos commandes...
        </div>
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: '1.5rem' }}>
                Mes commandes
            </h1>

            {orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem' }}>Vous n'avez pas encore de commande.</p>
                    <Link href="/products" style={{
                        display: 'inline-block', marginTop: '1rem',
                        background: 'var(--color-primary)', color: '#fff',
                        padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none',
                    }}>
                        Découvrir les produits
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {orders.map(order => {
                        const s = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                        return (
                            <Link key={order.id} href={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    background: '#fff', borderRadius: '12px',
                                    padding: '1.25rem', boxShadow: 'var(--shadow)',
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    transition: 'box-shadow 0.2s',
                                    cursor: 'pointer',
                                }}
                                     onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,106,79,0.13)'}
                                     onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        Commande #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                                            <span style={{
                                                background: s.bg, color: s.color,
                                                fontSize: '0.75rem', fontWeight: 700,
                                                padding: '0.2rem 0.6rem', borderRadius: '99px',
                                            }}>
                        {s.label}
                      </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
                                            {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            {order.hub_name && ` · ${order.hub_name}`}
                                            {order.item_count && ` · ${order.item_count} article${order.item_count > 1 ? 's' : ''}`}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                                        {parseFloat(order.total_amount).toFixed(2)} €
                                    </div>
                                    <span style={{ color: 'var(--color-muted)', fontSize: '1.2rem' }}>→</span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}