require('dotenv').config();
const { pool } = require('./database');

const createTables = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Extension pour les UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // ============================================
    // TABLE : users (tous les utilisateurs)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('consumer', 'producer', 'admin')),
        phone VARCHAR(20),
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT true,
        oauth_provider VARCHAR(50),
        oauth_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : producers (profil producteur)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS producers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        farm_name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(10),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        stripe_account_id VARCHAR(255),
        is_verified BOOLEAN DEFAULT false,
        labels TEXT[], -- ['bio', 'aop', 'label_rouge']
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : products (catalogue)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        unit VARCHAR(50) NOT NULL, -- 'kg', 'piece', 'litre'...
        stock_quantity DECIMAL(10,2) DEFAULT 0,
        category VARCHAR(100),
        images TEXT[],
        labels TEXT[],
        is_available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : hubs (points de retrait)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS hubs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        postal_code VARCHAR(10),
        latitude DECIMAL(9,6),
        longitude DECIMAL(9,6),
        opening_hours JSONB,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : orders (commandes)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        consumer_id UUID NOT NULL REFERENCES users(id),
        hub_id UUID REFERENCES hubs(id),
        status VARCHAR(50) DEFAULT 'pending'
          CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
        total_amount DECIMAL(10,2) NOT NULL,
        platform_fee DECIMAL(10,2),
        stripe_payment_intent_id VARCHAR(255),
        qr_code VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : order_items (lignes de commande)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        producer_id UUID NOT NULL REFERENCES producers(id),
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL
      )
    `);

    // ============================================
    // TABLE : subscriptions (paniers hebdomadaires)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        consumer_id UUID NOT NULL REFERENCES users(id),
        hub_id UUID REFERENCES hubs(id),
        items JSONB NOT NULL, -- [{product_id, quantity}]
        is_active BOOLEAN DEFAULT true,
        next_order_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // ============================================
    // TABLE : reviews (avis)
    // ============================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        consumer_id UUID NOT NULL REFERENCES users(id),
        producer_id UUID NOT NULL REFERENCES producers(id),
        order_id UUID REFERENCES orders(id),
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Migration terminée — toutes les tables ont été créées');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur lors de la migration :', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

createTables();
