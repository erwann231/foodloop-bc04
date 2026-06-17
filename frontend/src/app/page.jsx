import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center', maxWidth: 600 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🥦</div>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
          FoodLoop
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--color-muted)', marginBottom: '2.5rem' }}>
          Circuits courts alimentaires — connectez-vous directement avec vos producteurs locaux
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/products" style={{ padding: '0.75rem 2rem', background: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Découvrir les produits
          </Link>
          <Link href="/auth/login" style={{ padding: '0.75rem 2rem', border: '2px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: 'var(--radius)', fontWeight: 600 }}>
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  );
}
