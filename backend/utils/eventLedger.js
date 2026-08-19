const db = require('../config/db');
const crypto = require('crypto');

/**
 * Institutional Event Ledger Helper
 * Append-only, hash-chained forensic audit layer.
 */
async function logEvent({ event_type, actor_id, asset_id = null, role, payload_json }, txClient = null) {
  try {
    const client = txClient || db;
    if (txClient) await client.query('SAVEPOINT ledger_sp');

    // 1. Fetch latest hash for chaining
    const lastEvent = await client.query(
      'SELECT current_hash FROM event_log ORDER BY created_at DESC, id DESC LIMIT 1'
    ).catch(() => ({ rowCount: 0 }));
    const previousHash = lastEvent.rowCount > 0 ? lastEvent.rows[0].current_hash : 'GENESIS';

    // 2. Calculate deterministic current hash
    const payloadStr = JSON.stringify(payload_json);
    const hashInput = `${previousHash}|${event_type}|${actor_id}|${asset_id}|${payloadStr}`;
    const currentHash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // 3. Write to Event Ledger
    await client.query(
      `INSERT INTO event_log (event_type, actor_id, asset_id, role, payload_json, previous_hash, current_hash) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event_type, actor_id, asset_id, role, payload_json, previousHash, currentHash]
    );

    const { notifyService } = require('../config/notificationHelper');
    await notifyService({ event_type, actor_id, asset_id, role, payload_json }).catch(() => {});

    // (Legacy Mirroring Removed to prevent hash chain corruption in audit_logs)

    if (txClient) await client.query('RELEASE SAVEPOINT ledger_sp');
    return true;
  } catch (err) {
    console.warn('[LEDGER_WARNING] Event logging failed, rolling back savepoint:', err.message);
    if (txClient) await txClient.query('ROLLBACK TO SAVEPOINT ledger_sp').catch(() => {});
    return false;
  }
}

/**
 * Verify Ledger Integrity
 */
async function verifyLedger() {
  try {
    const events = await db.query('SELECT * FROM event_log ORDER BY created_at ASC, id ASC');
    let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
    
    for (const event of events.rows) {
      const currentPrevHash = event.previous_hash || 'GENESIS';
      const effectivePrevHash = prevHash === '0000000000000000000000000000000000000000000000000000000000000000' && currentPrevHash === 'GENESIS' ? 'GENESIS' : prevHash;

      if (currentPrevHash !== effectivePrevHash) {
         if (currentPrevHash !== '0000000000000000000000000000000000000000000000000000000000000000' && currentPrevHash !== 'GENESIS') {
             return { valid: false, broken_at: event.id };
         }
      }
      
      const payloadStr = JSON.stringify(event.payload_json || {});
      const hashInput = `${currentPrevHash}|${event.event_type}|${event.actor_id}|${event.asset_id}|${payloadStr}`;
      const expectedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
      
      if (event.current_hash !== expectedHash) return { valid: false, broken_at: event.id };
      prevHash = event.current_hash;
    }
    
    return { valid: true };
  } catch (err) {
    console.error('[LEDGER_VERIFY_ERROR]', err);
    return { valid: false, error: err.message };
  }
}

module.exports = { logEvent, verifyLedger };
