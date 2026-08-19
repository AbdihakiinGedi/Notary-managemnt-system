const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database. Starting reset...');

    // Fetch all operational tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('users', 'roles', 'schema_migrations');
    `);

    const tablesToTruncate = res.rows.map(row => `"${row.table_name}"`);
    
    if (tablesToTruncate.length > 0) {
      console.log(`Truncating tables: ${tablesToTruncate.join(', ')}`);
      // We use CASCADE to drop dependent rows (like constraints/fks across the operational tables)
      await client.query(`TRUNCATE TABLE ${tablesToTruncate.join(', ')} CASCADE;`);
    } else {
      console.log('No operational tables found to truncate.');
    }

    console.log('✅ Database reset complete. Operational data cleared. Schema and users intact.');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();
