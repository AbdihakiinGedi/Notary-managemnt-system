const db = require('../config/db');

async function testAccept() {
  try {
    const transferId = '56bfcb2c-2c26-4196-b3ec-e925f7f3911a';
    const userId = '3b7d8b4d-325b-4da5-b12a-ce18259ab7fd';

    // Same logic as PATCH /:id/accept
    const checkRes = await db.query('SELECT to_user, status, from_user, property_id FROM ownership_transfers WHERE id = $1', [transferId]);
    if (checkRes.rowCount === 0) throw new Error('Transfer not found');
    const transfer = checkRes.rows[0];
    
    if (transfer.status !== 'initiated') throw new Error('Transfer is not in initiated status');
    if (transfer.to_user !== userId) throw new Error('Only the intended buyer can accept this transfer');

    const buyerCheck = await db.query('SELECT id, profile_photo FROM users WHERE id = $1', [userId]);
    if (buyerCheck.rowCount === 0) throw new Error('Buyer does not exist');
    if (!buyerCheck.rows[0]?.profile_photo) throw new Error('Buyer Profile photo is required');

    const sellerCheck = await db.query('SELECT id, profile_photo FROM users WHERE id = $1', [transfer.from_user]);
    if (sellerCheck.rowCount === 0) throw new Error('Seller does not exist');
    if (!sellerCheck.rows[0]?.profile_photo) throw new Error('Seller Profile photo is required');

    const propertyCheck = await db.query('SELECT id FROM properties WHERE id = $1', [transfer.property_id]);
    if (propertyCheck.rowCount === 0) throw new Error('Property does not exist');

    console.log("Validation passed! Transfer could be accepted.");
  } catch (err) {
    console.error("ACCEPT_ERROR:", err.message);
  } finally {
    process.exit(0);
  }
}

testAccept();
