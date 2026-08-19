const db = require('./config/db');
const { logAudit } = require('./utils/auditLogger');
const { logEvent } = require('./utils/eventLedger');

async function test() {
  try {
    const propertyData = await db.withTransaction(async (tx) => {
      const propId = '1fbfbc82-b0a5-4b70-b64b-02e4f3584e21';
      const updateRes = await tx.query(
        "UPDATE properties SET status = 'LOCKED' WHERE id = $1 RETURNING *", 
        [propId]
      );
      if (updateRes.rowCount === 0) throw new Error('Not found');
      
      const userId = updateRes.rows[0].owner_id;
      
      await logAudit('PROPERTY_LOCKED', userId, propId, { reason: 'Test Reason' }, tx);
      await logEvent({
        event_type: 'PROPERTY_LOCKED',
        actor_id: userId,
        asset_id: propId,
        role: 'admin',
        payload_json: { status: 'LOCKED', reason: 'Test Reason' }
      }, tx);
      
      return updateRes.rows[0];
    });
    console.log('SUCCESS:', propertyData.id);
  } catch (err) {
    console.error('FAILED:', err.message);
  }
  process.exit();
}

test();
