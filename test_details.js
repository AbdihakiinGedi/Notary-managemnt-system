const db = require('./backend/config/db');

async function test() {
  try {
    const query = `
      SELECT 
        t.id as transfer_id, t.price, t.status, t.created_at as transfer_date,
        p.id as property_id, p.title as property_title, p.district, p.type as property_type, p.metadata->>'area' as area, p.metadata->>'registration_number' as registration_number,
        u_seller.full_name as seller_name, u_seller.national_id as seller_national_id, u_seller.profile_photo as seller_photo, u_seller.email as seller_email, u_seller.phone as seller_phone,
        u_buyer.full_name as buyer_name, u_buyer.national_id as buyer_national_id, u_buyer.profile_photo as buyer_photo, u_buyer.email as buyer_email, u_buyer.phone as buyer_phone,
        ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed
      FROM ownership_transfers t
      JOIN properties p ON t.property_id = p.id
      JOIN users u_seller ON t.from_user = u_seller.id
      JOIN users u_buyer ON t.to_user = u_buyer.id
      LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
      WHERE t.id = '13c852db-cdbc-4547-8592-324f3aa9a6e6'
    `;
    const res = await db.query(query);
    console.log("Details row:", res.rows[0]);

    if (res.rowCount > 0) {
      const details = res.rows[0];
      const docRes = await db.query(
        `SELECT id, file_path as document_url, file_name as document_type, created_at as uploaded_at 
         FROM documents 
         WHERE property_id = $1`,
        [details.property_id]
      );
      console.log("Documents:", docRes.rows);
    }
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    process.exit(0);
  }
}

test();
