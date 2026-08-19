const db = require('../config/db');
const crypto = require('crypto');

async function rebuildSnapshot() {
  console.log('--- [REBUILD_SNAPSHOT_START] ---');
  try {
    const assetsRes = await db.query('SELECT COUNT(*) as count FROM assets');
    const ownershipsRes = await db.query('SELECT COUNT(*) as count FROM asset_ownerships');
    const transfersRes = await db.query('SELECT COUNT(*) as count FROM ownership_transfers');

    const activeTransfers = await db.query(`
      SELECT id, status, updated_at 
      FROM ownership_transfers 
      WHERE status NOT IN ('completed', 'rejected', 'failed')
      ORDER BY id ASC
    `);
    
    const activeTransfersPayload = activeTransfers.rows.map(t => `${t.id}:${t.status}:${t.updated_at.getTime()}`).join('|');
    const activeTransfersHash = crypto.createHash('sha256').update(activeTransfersPayload).digest('hex');
    
    const currentSnapshotData = `${assetsRes.rows[0].count}:${ownershipsRes.rows[0].count}:${activeTransfersHash}`;

    const prevRes = await db.query('SELECT snapshot_hash FROM system_snapshot_log ORDER BY created_at DESC LIMIT 1');
    const prevHash = prevRes.rowCount > 0 ? prevRes.rows[0].snapshot_hash : '0'.repeat(64);

    const snapshotHash = crypto.createHash('sha256').update(prevHash + currentSnapshotData).digest('hex');

    await db.query(`
      INSERT INTO system_snapshot_log (asset_count, ownership_count, active_transfers_hash, previous_hash, snapshot_hash)
      VALUES ($1, $2, $3, $4, $5)
    `, [assetsRes.rows[0].count, ownershipsRes.rows[0].count, activeTransfersHash, prevHash, snapshotHash]);

    console.log(`[GLOBAL_SNAPSHOT_REBUILT] Hash: ${snapshotHash}`);
    console.log(`Assets: ${assetsRes.rows[0].count} | Ownerships: ${ownershipsRes.rows[0].count} | Transfers: ${transfersRes.rows[0].count}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Failed to rebuild global snapshot:', err);
    process.exit(1);
  }
}

rebuildSnapshot();
