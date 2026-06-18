'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { productsApi } from '@/lib/api';

const CATEGORIES = ['Tous', 'legumes', 'fruits', 'viandes', 'produits-laitiers', 'epicerie', 'boissons'];
const LABELS = ['bio', 'local', 'aop', 'label_rouge'];

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', category: '', label: '', city: '' });
    const [cart, setCart] = useState([]);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem('foodloop_cart');
        if (stored) setCart(JSON.parse(stored));
        const user = JSON.parse(localStorage.getItem('foodloop_user') || 'null');
        if (user) setUserRole(user.role);
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [filters]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.search)   params.search   = filters.search;
            if (filters.category && filters.category !== 'Tous') params.category = filters.category;
            if (filters.label)    params.label    = filters.label;
            if (filters.city)     params.city     = filters.city;

            const { products } = await productsApi.getAll(params);
            setProducts(products);
        } catch (err) {
            console.error('Erreur chargement produits :', err);
        } finally {
            setLoading(false);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(i => i.id === product.id);
        const updated = existing
            ? cart.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
            : [...cart, { ...product, quantity: 1 }];
        setCart(updated);
        localStorage.setItem('foodloop_cart', JSON.stringify(updated));
    };

    const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>

            {/* En-tête */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                        Nos produits locaux
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginTop: '0.25rem' }}>
                        {loading ? '...' : `${products.length} produit${products.length > 1 ? 's' : ''} disponible${products.length > 1 ? 's' : ''}`}
                    </p>
                </div>
                {cartCount > 0 && (
                    <Link href="/cart" style={{
                        background: 'var(--color-primary)',
                        color: '#fff',
                        padding: '0.6rem 1.2rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        fontSize: '0.95rem',
                    }}>
                        🛒 Panier ({cartCount})
                    </Link>
                )}
            </div>

            {/* Filtres */}
            <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem',
                boxShadow: 'var(--shadow)',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
            }}>
                {/* Recherche */}
                <div style={{ flex: '1 1 200px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
                        Rechercher
                    </label>
                    <input
                        type="text"
                        placeholder="Tomates, fromage..."
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        style={{
                            width: '100%', padding: '0.6rem 0.8rem',
                            border: '1.5px solid var(--color-border)', borderRadius: '8px',
                            fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Ville */}
                <div style={{ flex: '1 1 150px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
                        Ville
                    </label>
                    <input
                        type="text"
                        placeholder="Paris, Lyon..."
                        value={filters.city}
                        onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        style={{
                            width: '100%', padding: '0.6rem 0.8rem',
                            border: '1.5px solid var(--color-border)', borderRadius: '8px',
                            fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>

                {/* Catégorie */}
                <div style={{ flex: '1 1 160px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
                        Catégorie
                    </label>
                    <select
                        value={filters.category}
                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                        style={{
                            width: '100%', padding: '0.6rem 0.8rem',
                            border: '1.5px solid var(--color-border)', borderRadius: '8px',
                            fontSize: '0.95rem', outline: 'none', background: '#fff', boxSizing: 'border-box',
                        }}
                    >
                        {CATEGORIES.map(c => (
                            <option key={c} value={c === 'Tous' ? '' : c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')}</option>
                        ))}
                    </select>
                </div>

                {/* Label */}
                <div style={{ flex: '1 1 140px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.35rem' }}>
                        Label
                    </label>
                    <select
                        value={filters.label}
                        onChange={(e) => setFilters({ ...filters, label: e.target.value })}
                        style={{
                            width: '100%', padding: '0.6rem 0.8rem',
                            border: '1.5px solid var(--color-border)', borderRadius: '8px',
                            fontSize: '0.95rem', outline: 'none', background: '#fff', boxSizing: 'border-box',
                        }}
                    >
                        <option value="">Tous</option>
                        {LABELS.map(l => (
                            <option key={l} value={l}>{l.toUpperCase()}</option>
                        ))}
                    </select>
                </div>

                {/* Reset */}
                <button
                    onClick={() => setFilters({ search: '', category: '', label: '', city: '' })}
                    style={{
                        padding: '0.6rem 1rem', background: 'none',
                        border: '1.5px solid var(--color-border)', borderRadius: '8px',
                        cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-muted)',
                    }}
                >
                    Réinitialiser
                </button>
            </div>

            {/* Grille produits */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-muted)' }}>
                    Chargement des produits...
                </div>
            ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌱</div>
                    <p style={{ color: 'var(--color-muted)', fontSize: '1.1rem' }}>Aucun produit trouvé pour ces critères.</p>
                    <button onClick={() => setFilters({ search: '', category: '', label: '', city: '' })}
                            style={{ marginTop: '1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 600 }}>
                        Voir tous les produits
                    </button>
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} onAddToCart={addToCart} userRole={userRole} />
                    ))}
                </div>
            )}
        </div>
    );
}

function ProductCard({ product, onAddToCart, userRole }) {
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
        onAddToCart(product);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
    };

    return (
        <div style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
        }}
             onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(45,106,79,0.13)'; }}
             onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow)'; }}
        >
            {/* Image placeholder */}
            <div style={{
                height: '160px',
                background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '3.5rem',
            }}>
                {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    getCategoryEmoji(product.category)
                )}
            </div>

            <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Labels */}
                {product.labels?.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        {product.labels.map(label => (
                            <span key={label} style={{
                                background: '#d1fae5', color: '#065f46',
                                fontSize: '0.7rem', fontWeight: 700,
                                padding: '0.15rem 0.5rem', borderRadius: '99px',
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                            }}>
                {label}
              </span>
                        ))}
                    </div>
                )}

                <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    {product.name}
                </h3>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', color: 'var(--color-muted)', flex: 1 }}>
                    {product.farm_name} · {product.producer_city}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
              {parseFloat(product.price).toFixed(2)} €
            </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginLeft: '0.25rem' }}>
              / {product.unit}
            </span>
                    </div>
                    {userRole !== 'producer' && (
                        <button
                            onClick={handleAdd}
                            style={{
                                background: added ? '#10b981' : 'var(--color-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.45rem 0.9rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                        >
                            {added ? '✓ Ajouté' : '+ Panier'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function getCategoryEmoji(category) {
    const map = {
        legumes: '🥦', fruits: '🍎', viandes: '🥩',
        'produits-laitiers': '🧀', epicerie: '🫙', boissons: '🍶',
    };
    return map[category] || '🌿';
}