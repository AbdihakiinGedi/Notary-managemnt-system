const db = require('./config/db');

async function testApi() {
  const q = `SELECT t.*, p.title as property_title, p.type as property_type, u1.full_name as seller_name, u2.full_name as buyer_name, u1.profile_photo as seller_photo, u2.profile_photo as buyer_photo, CASE WHEN t.status = 'completed' THEN u2.full_name ELSE u1.full_name END as owner_name, CASE WHEN t.status = 'completed' THEN u2.profile_photo ELSE u1.profile_photo END as owner_photo,
                  ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed, ta.locked
           FROM ownership_transfers t 
           JOIN properties p ON t.property_id = p.id 
           JOIN users u1 ON t.from_user = u1.id 
           JOIN users u2 ON t.to_user = u2.id 
           LEFT JOIN users u_owner ON p.owner_id = u_owner.id
           LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
           WHERE t.status = 'accepted' AND t.notary_request_id = $1
           ORDER BY t.created_at DESC`;
  const notary_id = '48f7f88b-ddaf-4c2d-b820-0d4b24a71c93';
  const res = await db.query(q, [notary_id]);
  console.log(res.rows);
  process.exit(0);
}
testApi();
