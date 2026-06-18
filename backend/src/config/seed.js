require('dotenv').config();
const { pool } = require('./database');
const bcrypt = require('bcryptjs');

const seed = async () => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🌱 Insertion des données de test...');

        // Nettoyer les données existantes (dans l'ordre des dépendances)
        await client.query('DELETE FROM order_items');
        await client.query('DELETE FROM orders');
        await client.query('DELETE FROM products');
        await client.query('DELETE FROM producers');
        await client.query('DELETE FROM users WHERE email LIKE \'%@test-foodloop.fr\'');

        // ── Producteurs ──────────────────────────────────────────────
        const passwordHash = await bcrypt.hash('password123', 10);

        const user1 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
      VALUES ('ferme.dupont@test-foodloop.fr', $1, 'Jean', 'Dupont', 'producer', '0612345678')
      RETURNING id
    `, [passwordHash]);

        const user2 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
      VALUES ('maraicher.martin@test-foodloop.fr', $1, 'Marie', 'Martin', 'producer', '0687654321')
      RETURNING id
    `, [passwordHash]);

        const user3 = await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, phone)
      VALUES ('chevrerie.bernard@test-foodloop.fr', $1, 'Paul', 'Bernard', 'producer', '0698765432')
      RETURNING id
    `, [passwordHash]);

        // Profils producteurs
        const prod1 = await client.query(`
      INSERT INTO producers (user_id, farm_name, description, city, postal_code, is_verified, labels)
      VALUES ($1, 'Ferme Dupont', 'Maraîcher bio depuis 1995, cultures en plein air sur 12 hectares en Île-de-France.', 'Paris', '75001', true, ARRAY['bio', 'local'])
      RETURNING id
    `, [user1.rows[0].id]);

        const prod2 = await client.query(`
      INSERT INTO producers (user_id, farm_name, description, city, postal_code, is_verified, labels)
      VALUES ($1, 'Maraîchage Martin', 'Producteur de fruits et légumes de saison, livraison directe sans intermédiaire.', 'Lyon', '69001', true, ARRAY['local', 'label_rouge'])
      RETURNING id
    `, [user2.rows[0].id]);

        const prod3 = await client.query(`
      INSERT INTO producers (user_id, farm_name, description, city, postal_code, is_verified, labels)
      VALUES ($1, 'Chèvrerie Bernard', 'Fromages artisanaux au lait cru de chèvre, affinage traditionnel en cave.', 'Paris', '75015', true, ARRAY['bio', 'aop'])
      RETURNING id
    `, [user3.rows[0].id]);

        const p1 = prod1.rows[0].id;
        const p2 = prod2.rows[0].id;
        const p3 = prod3.rows[0].id;

        // ── Produits ─────────────────────────────────────────────────
        await client.query(`
      INSERT INTO products (producer_id, name, description, price, unit, stock_quantity, category, labels, is_available)
      VALUES
      ($1, 'Tomates cerises', 'Variété cerise rouge, récoltées ce matin. Idéales en salade.', 3.50, 'kg', 50, 'legumes', ARRAY['bio'], true),
      ($1, 'Carottes nouvelles', 'Variété Nantaise, jeunes et croquantes. Botte de 500g environ.', 2.00, 'botte', 80, 'legumes', ARRAY['bio', 'local'], true),
      ($1, 'Courgettes rondes', 'À farcir ou en gratin, cueillis à maturité optimale.', 1.80, 'piece', 60, 'legumes', ARRAY['bio'], true),
      ($1, 'Salade batavia', 'Croquante et savoureuse, sans pesticides.', 1.50, 'piece', 40, 'legumes', ARRAY['bio', 'local'], true)
    `, [p1]);

        await client.query(`
      INSERT INTO products (producer_id, name, description, price, unit, stock_quantity, category, labels, is_available)
      VALUES
      ($1, 'Fraises Gariguette', 'La reine des fraises, ramassées tôt le matin pour garder leur fraîcheur.', 5.50, 'barquette', 30, 'fruits', ARRAY['local', 'label_rouge'], true),
      ($1, 'Pommes Golden', 'Pommes croustillantes de notre verger, conservation naturelle sans traitement.', 3.20, 'kg', 100, 'fruits', ARRAY['local'], true),
      ($1, 'Poires Conférence', 'Juteuses et sucrées, récoltées à pleine maturité.', 3.80, 'kg', 45, 'fruits', ARRAY['local'], true),
      ($1, 'Cerises Burlat', 'Premières cerises de la saison, grosses et sucrées.', 6.50, 'kg', 25, 'fruits', ARRAY['local', 'label_rouge'], true)
    `, [p2]);

        await client.query(`
      INSERT INTO products (producer_id, name, description, price, unit, stock_quantity, category, labels, is_available)
      VALUES
      ($1, 'Fromage de chèvre frais', 'Faisselle crémeuse au lait cru, idéale avec du miel ou des herbes.', 4.80, 'piece', 20, 'produits-laitiers', ARRAY['bio', 'aop'], true),
      ($1, 'Chèvre affiné 3 semaines', 'Croûte fleurie, pâte fondante. Notre spécialité maison.', 6.20, 'piece', 15, 'produits-laitiers', ARRAY['bio', 'aop'], true),
      ($1, 'Miel de fleurs sauvages', 'Récolte printanière, fleurs des champs d''Île-de-France.', 8.90, 'pot', 25, 'epicerie', ARRAY['bio', 'local'], true),
      ($1, 'Yaourts nature', 'Au lait de chèvre entier, fermentation naturelle 12h. Lot de 4.', 5.60, 'lot', 18, 'produits-laitiers', ARRAY['bio'], true)
    `, [p3]);

        // ── Consommateur test ────────────────────────────────────────
        await client.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ('consommateur@test-foodloop.fr', $1, 'Sophie', 'Leblanc', 'consumer')
    `, [passwordHash]);

        await client.query('COMMIT');

        console.log('✅ Données insérées avec succès !');
        console.log('');
        console.log('Comptes de test créés (mot de passe : password123) :');
        console.log('  🌾 Producteur 1 : ferme.dupont@test-foodloop.fr');
        console.log('  🌾 Producteur 2 : maraicher.martin@test-foodloop.fr');
        console.log('  🌾 Producteur 3 : chevrerie.bernard@test-foodloop.fr');
        console.log('  🛒 Consommateur : consommateur@test-foodloop.fr');
        console.log('');
        console.log('12 produits insérés dans 3 catégories.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erreur :', err.message);
    } finally {
        client.release();
        pool.end();
    }
};

seed();