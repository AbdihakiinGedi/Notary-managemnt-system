const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createDatabase() {
  console.log('🔄 Connecting to the database...');
  try {
    const schemaPath = path.join(__dirname, '..', 'models', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🗑️ Wiping and recreating the public schema...');
    
    // We already have DROP SCHEMA public CASCADE; CREATE SCHEMA public; in schema.sql
    // but just in case, we execute the whole file as a giant transaction
    await pool.query('BEGIN');
    
    console.log('📜 Executing schema.sql...');
    await pool.query(schemaSql);
    
    await pool.query('COMMIT');
    console.log('✅ Database created successfully!');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('❌ Error creating database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDatabase();
