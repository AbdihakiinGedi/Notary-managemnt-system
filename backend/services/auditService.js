const db = require('../config/db');

const logAudit = async ({ user_id, action, property_id, metadata = {}, request_id }, retry = true) => {
  const insertQuery = `
    INSERT INTO audit_logs (user_id, action, affected_property_id, metadata, result) 
    VALUES ($1, $2, $3, $4, 'success')
  `;
  
  const enrichedMetadata = { ...metadata, request_id, timestamp: new Date().toISOString() };
  const params = [user_id, action, property_id, JSON.stringify(enrichedMetadata)];

  try {
    await db.query(insertQuery, params);
  } catch (err) {
    if (retry) {
      console.warn(`[AUDIT RETRY] Request ${request_id} failed once, retrying...`);
      return logAudit({ user_id, action, property_id, metadata, request_id }, false);
    }
    
    // Dead Letter Storage
    console.error(`[AUDIT DEAD LETTER] Request ${request_id} failed all retries. Storing in dead letter lounge.`);
    try {
      await db.query(`
        INSERT INTO audit_dead_letter (user_id, action, affected_property_id, metadata, error_message) 
        VALUES ($1, $2, $3, $4, $5)`,
        [user_id, action, property_id, enrichedMetadata, err.message]
      );
    } catch (dlErr) {
      console.error(`[CRITICAL AUDIT LOSS] Even dead letter failed: ${dlErr.message}`);
    }
  }
};

module.exports = { logAudit };
