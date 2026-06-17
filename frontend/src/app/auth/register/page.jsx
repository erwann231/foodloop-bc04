'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'consumer',
        phone: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { user, token } = await authApi.register(form);
            localStorage.setItem('foodloop_token', token);
            localStorage.setItem('foodloop_user', JSON.stringify(user));

            if (user.role === 'producer') {
                router.push('/dashboard');
            } else {
                router.push('/products');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.65rem 0.9rem',
        border: '1.5px solid var(--color-border)',
        borderRadius: '8px',
        fontSize: '1rem',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle = {
        display: 'block',
        fontWeight: 600,
        fontSize: '0.9rem',
        marginBottom: '0.35rem',
        color: 'var(--color-text)',
    };

    return (
        <div style={{
            minHeight: 'calc(100vh - 64px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f0faf4 0%, #ffffff 100%)',
            padding: '2rem',
        }}>
            <div style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '2.5rem',
                width: '100%',
                maxWidth: '480px',
                boxShadow: '0 4px 24px rgba(45,106,79,0.10)',
            }}>
                {/* En-tête */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥦</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Créer un compte
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Rejoignez la communauté FoodLoop
                    </p>
                </div>

                {/* Erreur */}
                {error && (
                    <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        color: '#991b1b',
                        fontSize: '0.9rem',
                        marginBottom: '1.5rem',
                    }}>
                        {error}
                    </div>
                )}

                {/* Sélecteur de rôle */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1.5rem',
                }}>
                    {[
                        { value: 'consumer', label: '🛒 Consommateur', desc: 'Je veux acheter' },
                        { value: 'producer', label: '🌾 Producteur', desc: 'Je veux vendre' },
                    ].map(({ value, label, desc }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setForm({ ...form, role: value })}
                            style={{
                                padding: '0.75rem',
                                border: `2px solid ${form.role === value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                borderRadius: '10px',
                                background: form.role === value ? '#f0faf4' : '#fff',
                                cursor: 'pointer',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: form.role === value ? 'var(--color-primary)' : 'var(--color-text)' }}>
                                {label}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                                {desc}
                            </div>
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Prénom + Nom */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>Prénom</label>
                            <input
                                type="text"
                                value={form.first_name}
                                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                placeholder="Jean"
                                required
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Nom</label>
                            <input
                                type="text"
                                value={form.last_name}
                                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                placeholder="Dupont"
                                required
                                style={inputStyle}
                                onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="jean@exemple.fr"
                            required
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Mot de passe</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Minimum 8 caractères"
                            required
                            minLength={8}
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Téléphone <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}>(optionnel)</span></label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="06 12 34 56 78"
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: loading ? '#9ca3af' : 'var(--color-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            fontSize: '1rem',
                            fontWeight: 700,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            marginTop: '0.5rem',
                        }}
                    >
                        {loading ? 'Création du compte...' : 'Créer mon compte'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                    Déjà un compte ?{' '}
                    <Link href="/auth/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        Se connecter
                    </Link>
                </p>
            </div>
        </div>
    );
}