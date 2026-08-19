const db = require('../config/db');

async function testQuery() {
  try {
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log("Tables:", tables.rows.map(r=>r.tablename));

    const res = await db.query("SELECT * FROM asset_certificates WHERE id = '2b3c2b08-1807-4fbe-a1ec-1419d142a04e'");
    console.log("Certificate:", res.rows[0]);
    if (res.rows[0]) {
      const assetRes = await db.query("SELECT * FROM properties WHERE id = $1", [res.rows[0].property_id || res.rows[0].asset_id]);
      console.log("Property:", assetRes.rows[0]);
    }
  } catch (error) {
    console.error("DB Error:", error.message);
  } finally {
    process.exit(0);
  }
}

testQuery();
