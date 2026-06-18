'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { productsApi } from '@/lib/api';

const CATEGORIES = ['legumes', 'fruits', 'viandes', 'produits-laitiers', 'epicerie', 'boissons'];
const UNITS = ['kg', 'piece', 'litre', 'botte', 'barquette', 'pot', 'lot', 'bouteille'];
const LABELS = ['bio', 'local', 'aop', 'label_rouge'];

export default function NewProductPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '',
        description: '',
        price: '',
        unit: 'kg',
        stock_quantity: '',
        category: 'legumes',
        labels: [],
    });

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (!user || user.role !== 'producer') router.push('/auth/login');
    }, []);

    const toggleLabel = (label) => {
        setForm(prev => ({
            ...prev,
            labels: prev.labels.includes(label)
                ? prev.labels.filter(l => l !== label)
                : [...prev.labels, label]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await productsApi.create({
                ...form,
                price: parseFloat(form.price),
                stock_quantity: parseFloat(form.stock_quantity) || 0,
            });
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.65rem 0.9rem',
        border: '1.5px solid var(--color-border)', borderRadius: '8px',
        fontSize: '1rem', outline: 'none', boxSizing: 'border-box',
        background: '#fff',
    };

    const labelStyle = {
        display: 'block', fontWeight: 600,
        fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--color-text)',
    };

    return (
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1rem' }}>

            {/* En-tête */}
            <div style={{ marginBottom: '2rem' }}>
                <Link href="/dashboard" style={{ color: 'var(--color-muted)', fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
                    ← Mon espace
                </Link>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                    Ajouter un produit
                </h1>
                <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                    Ce produit sera visible dans le catalogue dès sa publication.
                </p>
            </div>

            {/* Formulaire */}
            <div style={{ background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: 'var(--shadow)' }}>

                {error && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '0.75rem 1rem', color: '#991b1b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Nom */}
                    <div>
                        <label style={labelStyle}>Nom du produit *</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            placeholder="Ex: Tomates cerises, Fromage de chèvre..."
                            required
                            style={inputStyle}
                            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={labelStyle}>Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Décrivez votre produit, son origine, ses particularités..."
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    {/* Prix + Unité */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Prix (€) *</label>
                            <input
                                type="number"
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                required
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Unité *</label>
                            <select
                                value={form.unit}
                                onChange={e => setForm({ ...form, unit: e.target.value })}
                                style={inputStyle}
                            >
                                {UNITS.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Stock + Catégorie */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>Stock disponible</label>
                            <input
                                type="number"
                                value={form.stock_quantity}
                                onChange={e => setForm({ ...form, stock_quantity: e.target.value })}
                                placeholder="0"
                                min="0"
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Catégorie *</label>
                            <select
                                value={form.category}
                                onChange={e => setForm({ ...form, category: e.target.value })}
                                style={inputStyle}
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Labels */}
                    <div>
                        <label style={labelStyle}>Labels <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(optionnel)</span></label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {LABELS.map(label => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => toggleLabel(label)}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        border: `2px solid ${form.labels.includes(label) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: '99px',
                                        background: form.labels.includes(label) ? '#f0faf4' : '#fff',
                                        color: form.labels.includes(label) ? 'var(--color-primary)' : 'var(--color-muted)',
                                        fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                                        textTransform: 'uppercase', letterSpacing: '0.5px',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {form.labels.includes(label) ? '✓ ' : ''}{label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Boutons */}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                flex: 1, background: loading ? '#9ca3af' : 'var(--color-primary)',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                padding: '0.85rem', fontSize: '1rem', fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {loading ? 'Publication...' : 'Publier le produit'}
                        </button>
                        <Link href="/dashboard" style={{
                            padding: '0.85rem 1.5rem', border: '1.5px solid var(--color-border)',
                            borderRadius: '8px', color: 'var(--color-muted)',
                            textDecoration: 'none', fontWeight: 600, fontSize: '1rem',
                            display: 'flex', alignItems: 'center',
                        }}>
                            Annuler
                        </Link>
                    </div>

                </form>
            </div>
        </div>
    );
}