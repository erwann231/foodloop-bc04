'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ordersApi } from '@/lib/api';

const STEPS = ['pending', 'confirmed', 'preparing', 'ready', 'completed'];

const STATUS_INFO = {
    pending:   { label: 'En attente',     emoji: '⏳', desc: 'Votre commande est en attente de confirmation du producteur.' },
    confirmed: { label: 'Confirmée',      emoji: '✅', desc: 'Le producteur a confirmé votre commande.' },
    preparing: { label: 'En préparation', emoji: '👨‍🌾', desc: 'Votre commande est en cours de préparation.' },
    ready:     { label: 'Prête',          emoji: '📦', desc: 'Votre commande est prête ! Vous pouvez la récupérer au hub.' },
    completed: { label: 'Récupérée',      emoji: '🎉', desc: 'Commande récupérée. Merci et à bientôt !' },
    cancelled: { label: 'Annulée',        emoji: '❌', desc: 'Cette commande a été annulée.' },
};

export default function OrderDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user) return router.push('/auth/login');
        fetchOrder();
    }, [id]);

    useEffect(() => {
        // Socket.IO — connexion pour le suivi temps réel
        if (!order) return;

        let socket;
        try {
            const { io } = require('socket.io-client');
            socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

            socket.emit('join:order', id);

            socket.on('order:status_updated', ({ orderId, status }) => {
                if (orderId === id) {
                    setOrder(prev => ({ ...prev, status }));
                }
            });
        } catch (e) {
            // Socket.IO non disponible en SSR
        }

        return () => socket?.disconnect();
    }, [order?.id]);

    const fetchOrder = async () => {
        try {
            const { order } = await ordersApi.getOne(id);
            setOrder(order);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
            Chargement de la commande...
        </div>
    );

    if (!order) return (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
            <p style={{ color: 'var(--color-muted)' }}>Commande introuvable.</p>
            <Link href="/orders" style={{ color: 'var(--color-primary)' }}>← Mes commandes</Link>
        </div>
    );

    const info = STATUS_INFO[order.status] || STATUS_INFO.pending;
    const currentStep = STEPS.indexOf(order.status);

    return (
        <div style={{ maxWidth: '700px', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* Retour */}
            <Link href="/orders" style={{ color: 'var(--color-muted)', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.5rem' }}>
                ← Mes commandes
            </Link>

            {/* En-tête statut */}
            <div style={{
                background: '#fff', borderRadius: '16px',
                padding: '2rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>{info.emoji}</div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary)', margin: '0 0 0.5rem' }}>
                    {info.label}
                </h1>
                <p style={{ color: 'var(--color-muted)', margin: 0, fontSize: '0.95rem' }}>{info.desc}</p>

                {/* QR Code */}
                {order.status === 'ready' && (
                    <div style={{
                        marginTop: '1.5rem', background: '#f0faf4', borderRadius: '12px',
                        padding: '1rem', display: 'inline-block',
                    }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                            Code de retrait
                        </div>
                        <div style={{ fontFamily: 'Courier New', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--color-text)' }}>
                            {order.qr_code?.slice(0, 8).toUpperCase()}
                        </div>
                    </div>
                )}
            </div>

            {/* Barre de progression */}
            {order.status !== 'cancelled' && (
                <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>
                        Suivi de commande
                    </h2>
                    <div style={{ position: 'relative' }}>
                        {/* Ligne de fond */}
                        <div style={{ position: 'absolute', top: '14px', left: '14px', right: '14px', height: '3px', background: '#e5e7eb', borderRadius: '99px' }} />
                        {/* Ligne de progression */}
                        <div style={{
                            position: 'absolute', top: '14px', left: '14px',
                            height: '3px', background: 'var(--color-primary)', borderRadius: '99px',
                            width: currentStep >= 0 ? `${(currentStep / (STEPS.length - 1)) * (100 - 28 / 7)}%` : '0',
                            transition: 'width 0.5s ease',
                        }} />
                        {/* Étapes */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                            {STEPS.map((step, i) => {
                                const done = i <= currentStep;
                                return (
                                    <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '28px', height: '28px', borderRadius: '50%',
                                            background: done ? 'var(--color-primary)' : '#e5e7eb',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.75rem', color: done ? '#fff' : '#9ca3af',
                                            fontWeight: 700, transition: 'background 0.3s',
                                        }}>
                                            {done ? '✓' : i + 1}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: done ? 'var(--color-primary)' : '#9ca3af', fontWeight: done ? 700 : 400, textAlign: 'center' }}>
                      {STATUS_INFO[step]?.label}
                    </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Détail articles */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow)', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                    Articles commandés
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {order.items?.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < order.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.product_name}</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>{item.farm_name} · {item.quantity} {item.unit} × {parseFloat(item.unit_price).toFixed(2)} €</div>
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                                {parseFloat(item.subtotal).toFixed(2)} €
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-muted)', fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                        <span>Commission FoodLoop (8%)</span>
                        <span>{parseFloat(order.platform_fee).toFixed(2)} €</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                        <span>Total payé</span>
                        <span style={{ color: 'var(--color-primary)' }}>{parseFloat(order.total_amount).toFixed(2)} €</span>
                    </div>
                </div>
            </div>

            {/* Infos commande */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: 'var(--shadow)' }}>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
                    Informations
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-muted)' }}>Numéro de commande</span>
                        <span style={{ fontWeight: 600, fontFamily: 'Courier New' }}>#{order.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-muted)' }}>Date</span>
                        <span style={{ fontWeight: 600 }}>{new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {order.hub_name && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--color-muted)' }}>Point de retrait</span>
                            <span style={{ fontWeight: 600 }}>{order.hub_name}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}