const db = require('../config/db');
const q = `WITH unified_assets AS (
  SELECT id, title, type::text, owner_id, status FROM properties
  UNION ALL
  SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
)
SELECT t.id FROM ownership_transfers t 
JOIN unified_assets p ON t.property_id = p.id 
WHERE t.status = 'accepted' AND t.notary_request_id = $1`;
db.query(q, ['d4c403eb-3ebd-47fe-9c28-3a769e076765'])
  .then(res => console.log('Found:', res.rows))
  .catch(console.error)
  .finally(() => process.exit(0));
