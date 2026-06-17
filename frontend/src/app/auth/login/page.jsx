'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { user, token } = await authApi.login(form);
            localStorage.setItem('foodloop_token', token);
            localStorage.setItem('foodloop_user', JSON.stringify(user));

            // Redirection selon le rôle
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
                maxWidth: '420px',
                boxShadow: '0 4px 24px rgba(45,106,79,0.10)',
            }}>
                {/* En-tête */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🥦</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Connexion
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        Bienvenue sur FoodLoop
                    </p>
                </div>

                {/* Message d'erreur */}
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

                {/* Formulaire */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                            Adresse email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="jean@exemple.fr"
                            required
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.9rem',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem', color: 'var(--color-text)' }}>
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                            required
                            style={{
                                width: '100%',
                                padding: '0.65rem 0.9rem',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: '8px',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                            }}
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
                            transition: 'background 0.2s',
                        }}
                    >
                        {loading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                {/* Lien vers register */}
                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                    Pas encore de compte ?{' '}
                    <Link href="/auth/register" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        S'inscrire
                    </Link>
                </p>
            </div>
        </div>
    );
}