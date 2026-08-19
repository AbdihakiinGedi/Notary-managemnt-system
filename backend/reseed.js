const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function reseed() {
  const client = await pool.connect();
  try {
    console.log('--- RE-SEEDING REGISTRY (V3.1) ---');
    
    // Clear data
    await client.query('TRUNCATE notifications, audit_logs, ownership_transfers, asset_certificates, asset_ownerships, assets, event_log, properties, users, roles CASCADE');
    
    // Roles
    await client.query("INSERT INTO roles (id, name) VALUES (1, 'citizen'), (2, 'officer'), (3, 'notary'), (4, 'admin')");
    
    // Hash for 'Password123'
    const hash = '$2b$10$R7ywl3f/Fb70opdsaUaujeE3/vAHRMW.nwNQpSZrJRfsxGFdK11he';
    
    // Users
    await client.query(`
      INSERT INTO users (id, full_name, email, password_hash, role_id, phone) VALUES
      ('f1000000-0000-0000-0000-000000000001', 'Ahmed Hassan (Citizen)', 'ahmed@example.com', '${hash}', 1, '+252 615 111 222'),
      ('f1000000-0000-0000-0000-000000000002', 'Fatima Ali (Citizen)', 'fatima@example.com', '${hash}', 1, '+252 615 222 333'),
      ('f2000000-0000-0000-0000-000000000001', 'Mohamed Registry (Officer)', 'officer@example.com', '${hash}', 2, '+252 615 333 444'),
      ('f3000000-0000-0000-0000-000000000001', 'Sahra Ibrahim (Notary)', 'notary@example.com', '${hash}', 3, '+252 615 444 555'),
      ('f5000000-0000-0000-0000-000000000001', 'System Administrator', 'admin@example.com', '${hash}', 4, '+252 615 555 666');
    `);

    // Properties
    await client.query(`
      INSERT INTO properties (id, title, description, district, address, owner_id, status, type, metadata) VALUES
      ('f6000000-0000-0000-0000-000000000001', 'Hodan Residential Villa', 'Large 4-bedroom villa.', 'Hodan', 'Wadada Tarbuunka, Mogadishu', 'f1000000-0000-0000-0000-000000000001', 'registered', 'LAND', '{}'),
      ('f6000000-0000-0000-0000-000000000002', 'Hamar Weyne Commercial', 'Retail development site.', 'Hamar Weyne', 'Via Roma, Mogadishu', 'f1000000-0000-0000-0000-000000000002', 'registered', 'LAND', '{}')
    `);

    // Assets
    await client.query(`
      INSERT INTO assets (id, type, reference_id, current_owner_id, status, metadata) VALUES
      ('f6000000-0000-0000-0000-000000000001', 'land', 'f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'active', '{}'),
      ('f6000000-0000-0000-0000-000000000002', 'land', 'f6000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'active', '{}')
    `);

    // Asset Ownerships
    await client.query(`
      INSERT INTO asset_ownerships (asset_id, owner_id, start_date, active) VALUES
      ('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', NOW(), true),
      ('f6000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', NOW(), true)
    `);

    // Generate Certificates for Seed Properties
    const { generateCertificate } = require('./services/certificateService');
    await generateCertificate('f6000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001', null, client);
    await generateCertificate('f6000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000001', null, client);

    console.log('STATUS: Registry database reset and seeded successfully.');
    console.log('NOTICE: Use "Password123" (Capital P) to login.');
  } catch (err) {
    console.error('Reseed failed:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

reseed();
