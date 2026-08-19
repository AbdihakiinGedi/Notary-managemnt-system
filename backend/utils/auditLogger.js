const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

const logAudit = async (action, userId, propId, metadata = {}, tx = null) => {
  const execute = async (client) => {
    // 5. Write-Ahead Audit Intent (#5)
    // We insert a record with intent_only=true first, or just insert and then update.
    // Actually, we'll just insert it with the chain logic within the transaction.
    // If the process crashes after commit but before hash computation (if done in JS), 
    // we have a problem. So we compute hash inside the same transaction.
    
    // 10. Concurrency Guard (#10) - Absolute Sequential Locking
    await client.query('LOCK TABLE audit_logs IN EXCLUSIVE MODE');
    
    const prevRes = await client.query('SELECT current_hash, sequential_id FROM audit_logs ORDER BY sequential_id DESC LIMIT 1');
    const prevHash = prevRes.rowCount > 0 ? prevRes.rows[0].current_hash : '0'.repeat(64);
    const lastId = prevRes.rowCount > 0 ? parseInt(prevRes.rows[0].sequential_id) : 0;

    const recordData = canonicalize({ action, userId, propId, metadata });
    const currentHash = crypto.createHash('sha256').update(prevHash + recordData).digest('hex');

    const result = await client.query(
      `INSERT INTO audit_logs (action, user_id, affected_property_id, metadata, previous_hash, current_hash) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING sequential_id`,
      [action, userId, propId, JSON.stringify(metadata), prevHash, currentHash]
    );

    // 5. Ledger + Audit Chain Sync (#5)
    if (metadata && metadata.idempotencyHash) {
      await client.query(
        'INSERT INTO idempotency_ledger (request_hash, user_id, endpoint) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [metadata.idempotencyHash, userId, action]
      );
    }

    // 2. Audit Chain Gap Detection (#2)
    const newId = parseInt(result.rows[0].sequential_id);
    if (lastId > 0 && newId !== lastId + 1) {
      console.error(`[CRITICAL_AUDIT_GAP] Detected gap between ${lastId} and ${newId}`);
    }
  };

  try {
    if (tx) {
      await execute(tx);
    } else {
      await db.withTransaction(async (client) => {
        await execute(client);
      });
    }
  } catch (e) {
    console.error("⛔ [CRITICAL]: Immutable Audit Failed.", e.message);
    const fallbackPath = path.join(__dirname, '../audit_failed.log');
    fs.appendFileSync(fallbackPath, JSON.stringify({ action, userId, propId, metadata, error: e.message, timestamp: new Date().toISOString() }) + '\n');
    
    // CRITICAL FIX: If inside a transaction, RE-THROW to abort the main operation.
    // If we don't throw, the state change commits but the audit log is missing.
    throw new Error(`Audit integrity failure: ${e.message}`);
  }
};

module.exports = { logAudit };
