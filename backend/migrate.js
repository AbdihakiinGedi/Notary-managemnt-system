const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('--- Institutional Registry Migration ---');
    
    // Ensure transfers has sequential approval tracking
    await client.query(`
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS notary_id UUID REFERENCES users(id);
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS officer_id UUID REFERENCES users(id);
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS notary_approved_at TIMESTAMP;
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS officer_approved_at TIMESTAMP;
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2);
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS reason TEXT;
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP;
      ALTER TABLE transfers ADD COLUMN IF NOT EXISTS action_taken_by UUID REFERENCES users(id);
    `);

    // HARDENING: Prevent multiple pending transfers for the same property
    // A property is considered "in lifecycle" if status is pending_notary or pending_officer
    await client.query(`
      DROP INDEX IF EXISTS idx_unique_pending_transfer;
      CREATE UNIQUE INDEX idx_unique_pending_transfer ON transfers (property_id) 
      WHERE (status IN ('pending', 'pending_notary', 'pending_officer'));
    `);

    // Ensure properties has address
    await client.query(`
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS address TEXT;
    `);

    console.log('STATUS: Database schema synchronized with V3.1 standards.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
