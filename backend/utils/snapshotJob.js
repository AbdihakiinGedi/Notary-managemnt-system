const db = require('../config/db');
const crypto = require('crypto');

/**
 * 6. GLOBAL CONSISTENCY SNAPSHOT (FINAL SAFETY NET)
 * Acts as an external truth reference and forensic recovery anchor.
 */
const runGlobalSnapshotJob = async () => {
  console.log('--- [SNAPSHOT_JOB_START] Generating System Consistency Snapshot ---');
  try {
    // 3. SNAPSHOT INTEGRITY IMMUTABILITY HARDENING (#3)
    // Ensure table has chaining columns
    await db.query(`
      ALTER TABLE system_snapshot_log 
      ADD COLUMN IF NOT EXISTS previous_hash TEXT,
      ADD COLUMN IF NOT EXISTS snapshot_hash TEXT
    `);

    const assetsRes = await db.query('SELECT COUNT(*) as asset_count FROM assets');
    const ownershipRes = await db.query('SELECT COUNT(*) as ownership_count FROM asset_ownerships');
    
    // Hash of all active transfers to detect silent DB tampering
    const activeTransfers = await db.query(`
      SELECT id, status, updated_at 
      FROM ownership_transfers 
      WHERE status NOT IN ('completed', 'rejected', 'failed')
      ORDER BY id ASC
    `);
    
    const activeTransfersPayload = activeTransfers.rows.map(t => `${t.id}:${t.status}:${t.updated_at.getTime()}`).join('|');
    const currentSnapshotData = `${assetsRes.rows[0].asset_count}:${ownershipRes.rows[0].ownership_count}:${crypto.createHash('sha256').update(activeTransfersPayload).digest('hex')}`;

    const prevRes = await db.query('SELECT snapshot_hash FROM system_snapshot_log ORDER BY created_at DESC LIMIT 1');
    const prevHash = prevRes.rowCount > 0 ? prevRes.rows[0].snapshot_hash : '0'.repeat(64);

    const snapshotHash = crypto.createHash('sha256').update(prevHash + currentSnapshotData).digest('hex');

    await db.query(`
      INSERT INTO system_snapshot_log (asset_count, ownership_count, active_transfers_hash, previous_hash, snapshot_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [assetsRes.rows[0].asset_count, ownershipRes.rows[0].ownership_count, currentSnapshotData, prevHash, snapshotHash]);

    console.log(`[SNAPSHOT_JOB_SUCCESS] Assets: ${assetsRes.rows[0].asset_count}, Ownerships: ${ownershipRes.rows[0].ownership_count}, Hash: ${snapshotHash}`);
  } catch (err) {
    console.error('[SNAPSHOT_JOB_ERROR] Failed to generate consistency snapshot:', err.message);
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'SNAPSHOT_FAILURE',
        payload_json: { message: `Snapshot failure: Failed to generate consistency snapshot: ${err.message}` },
        category: 'security'
      });
    } catch (notifyErr) {
      console.error('Failed to notify snapshot generation failure:', notifyErr.message);
    }
  }
  console.log('--- [SNAPSHOT_JOB_END] ---');
};

module.exports = { runGlobalSnapshotJob };
