require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

if (!process.env.DATABASE_URL) {
  console.error('[FATAL ERROR] DATABASE_URL environment variable is missing.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('Starting Development Database Reset...');

    // 1. Read and apply schema
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying schema (this drops all tables and data)...');
    await client.query(schemaSql);
    console.log('Schema applied successfully.');

    // 2. Create the Single System Administrator
    const adminName = process.env.SEED_ADMIN_NAME || 'System Administrator';
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@sndnprs.gov.so';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || '123456';
    const adminNationalId = process.env.SEED_ADMIN_NATIONAL_ID || 'SND-ADMIN-001';

    console.log(`Seeding System Administrator: ${adminEmail}`);

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(adminPassword, salt);

    // Assuming role_id 4 is System Administrator based on existing schema
    await client.query(`
      INSERT INTO users (full_name, email, password_hash, role_id, national_id, account_status) 
      VALUES ($1, $2, $3, 4, $4, 'approved')
    `, [adminName, adminEmail, hash, adminNationalId]);

    console.log('Database reset complete. One verified System Administrator was created.');
    console.log('You can now log in using the configured credentials.');

  } catch (err) {
    console.error('Error during database reset:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

resetDatabase();
