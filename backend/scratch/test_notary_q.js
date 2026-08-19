const db = require('../config/db');

async function testNotaryQuery() {
  const q = `SELECT t.*, p.title as property_title, p.type as property_type, ta.id as agreement_id 
             FROM ownership_transfers t 
             JOIN properties p ON t.property_id = p.id 
             LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id 
             WHERE t.status = 'accepted' AND t.notary_request_id = 'd4c403eb-3ebd-47fe-9c28-3a769e076765'`;
  try {
    const res = await db.query(q);
    console.log(res.rows);
  } catch(e) { console.error(e); }
  process.exit(0);
}
testNotaryQuery();
