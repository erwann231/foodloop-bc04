'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('foodloop_user');
        if (stored) setUser(JSON.parse(stored));
        else setUser(null);
        setMenuOpen(false);
    }, [pathname]);

    const logout = () => {
        localStorage.removeItem('foodloop_token');
        localStorage.removeItem('foodloop_user');
        setUser(null);
        router.push('/');
    };

    return (
        <>
            <style>{`
        .nav-links { display: flex; align-items: center; gap: 1.5rem; }
        .nav-burger { display: none; background: none; border: none; cursor: pointer; font-size: 1.6rem; padding: 0.25rem; }
        .nav-drawer { display: none; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-burger { display: block !important; }
          .nav-drawer { display: flex; flex-direction: column; gap: 1rem;
            position: absolute; top: 64px; left: 0; right: 0;
            background: #fff; border-bottom: 1px solid #e8f5e9;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            padding: 1.25rem 1.5rem; z-index: 99; }
        }
      `}</style>

            <nav style={{
                background: '#fff', borderBottom: '1px solid #e8f5e9',
                padding: '0 1.5rem', height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                position: 'sticky', top: 0, zIndex: 100,
                boxShadow: '0 2px 8px rgba(45,106,79,0.07)',
            }}>
                {/* Logo */}
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
                    <span style={{ fontSize: '1.5rem' }}>🥦</span>
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--color-primary)' }}>FoodLoop</span>
                </Link>

                {/* Desktop */}
                <div className="nav-links">
                    <Link href="/products" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>Produits</Link>
                    {user ? (
                        <>
                            {user.role === 'producer' && <Link href="/dashboard" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>Mon espace</Link>}
                            {user.role === 'consumer' && <Link href="/orders" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>Mes commandes</Link>}
                            {user.role === 'consumer' && <Link href="/subscriptions" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>Abonnements</Link>}
                            {user.role === 'consumer' && (
                                <Link href="/cart" style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.4rem 1rem', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>🛒 Panier</Link>
                            )}
                            <button onClick={logout} style={{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none', fontSize: '0.95rem' }}>Connexion</Link>
                            <Link href="/auth/register" style={{ background: 'var(--color-primary)', color: '#fff', padding: '0.4rem 1.2rem', borderRadius: '6px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>S'inscrire</Link>
                        </>
                    )}
                </div>

                {/* Hamburger */}
                <button className="nav-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
                    {menuOpen ? '✕' : '☰'}
                </button>
            </nav>

            {/* Menu mobile */}
            {menuOpen && (
                <div className="nav-drawer">
                    <Link href="/products" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Produits</Link>
                    {user ? (
                        <>
                            {user.role === 'producer' && <Link href="/dashboard" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Mon espace</Link>}
                            {user.role === 'consumer' && <Link href="/orders" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Mes commandes</Link>}
                            {user.role === 'consumer' && <Link href="/subscriptions" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Abonnements</Link>}
                            {user.role === 'consumer' && <Link href="/cart" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>🛒 Panier</Link>}
                            <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.95rem', color: '#ef4444', fontWeight: 600, textAlign: 'left', padding: 0 }}>
                                Déconnexion
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href="/auth/login" style={{ color: 'var(--color-text)', fontWeight: 500, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>Connexion</Link>
                            <Link href="/auth/register" style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }} onClick={() => setMenuOpen(false)}>S'inscrire</Link>
                        </>
                    )}
                </div>
            )}
        </>
    );
}