'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('foodloop_user');
        if (stored) setUser(JSON.parse(stored));
    }, []);

    const logout = () => {
        localStorage.removeItem('foodloop_token');
        localStorage.removeItem('foodloop_user');
        setUser(null);
        router.push('/');
    };

    return (
        <nav style={{
            background: '#ffffff',
            borderBottom: '1px solid #e8f5e9',
            padding: '0 2rem',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            boxShadow: '0 2px 8px rgba(45,106,79,0.07)',
        }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                <span style={{ fontSize: '1.5rem' }}>🥦</span>
                <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>
          FoodLoop
        </span>
            </Link>

            {/* Nav links */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <Link href="/products" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>
                    Produits
                </Link>

                {user ? (
                    <>
                        {user.role === 'producer' && (
                            <Link href="/dashboard" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>
                                Mon espace
                            </Link>
                        )}
                        {user.role === 'consumer' && (
                            <Link href="/orders" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>
                                Mes commandes
                            </Link>
                        )}
                        <Link href="/cart" style={{
                            background: 'var(--color-primary)',
                            color: '#fff',
                            padding: '0.4rem 1rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                        }}>
                            🛒 Panier
                        </Link>
                        <button onClick={logout} style={{
                            background: 'none',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                            padding: '0.4rem 1rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: 'var(--color-muted)',
                        }}>
                            Déconnexion
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/auth/login" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>
                            Connexion
                        </Link>
                        <Link href="/auth/register" style={{
                            background: 'var(--color-primary)',
                            color: '#fff',
                            padding: '0.4rem 1.2rem',
                            borderRadius: '6px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            fontSize: '0.9rem',
                        }}>
                            S'inscrire
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}