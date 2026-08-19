const db = require('../config/db');
const q = `WITH unified_assets AS (
  SELECT id, title, type::text, owner_id, status FROM properties
  UNION ALL
  SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets
)
SELECT t.id FROM ownership_transfers t JOIN unified_assets p ON t.property_id = p.id`;
db.query(q).then(res => console.log('OK', res.rowCount)).catch(console.error).finally(() => process.exit(0));
