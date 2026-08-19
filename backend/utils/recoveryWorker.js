const db = require('../config/db');
const { logAudit } = require('./auditLogger');
const crypto = require('crypto');

const acquireDeterministicLocks = async (tx, ids) => {
  const validIds = ids.filter(id => id).map(id => String(id));
  validIds.sort();
  for (const id of validIds) {
    const lockKey = parseInt(crypto.createHash('sha256').update(id).digest('hex').substring(0, 8), 16);
    await tx.query('SELECT pg_advisory_xact_lock($1)', [lockKey]);
  }
};

/**
 * RECOVERY JOB (CRASH RESILIENCE & ORPHAN DETECTION)
 * Unified around the ownership_transfers architecture
 */
const runRecoveryWorker = async () => {
  console.log('--- [RECOVERY_WORKER_START] ---');
  try {
    // 1. Detect transfers stuck in INITIATED or ACCEPTED for > 2 hours and fail them
    const stuckTransfers = await db.query(`
      UPDATE ownership_transfers 
      SET status = 'failed', updated_at = NOW() 
      WHERE status IN ('initiated', 'accepted') AND created_at < NOW() - INTERVAL '2 hours'
      RETURNING id, property_id
    `);

    for (const stuck of stuckTransfers.rows) {
      console.log(`[RECOVERY_ORPHAN] Stuck initiated/accepted transfer ${stuck.id} moved to failed.`);
      await logAudit('TRANSFER_FAILED_TIMEOUT', 'f5000000-0000-0000-0000-000000000001', stuck.property_id, { transfer_id: stuck.id, reason: 'Timeout' });
      
      try {
        const { notifyService } = require('../config/notificationHelper');
        await notifyService({
          event_type: 'TRANSFER_FAILED',
          payload_json: { message: `Transfer failed timeout: Stuck initiated/accepted transfer ${stuck.id} moved to failed.` },
          category: 'security'
        });
      } catch (notifyErr) {
        console.error('Failed to notify failed transfer timeout:', notifyErr.message);
      }
    }

    // 2. Detect and Repair Ownership Mismatches
    const ownershipOrphans = await db.query(`
      SELECT a.id as asset_id, a.current_owner_id, ao.owner_id as active_record_owner, ao.id as ao_id
      FROM assets a
      LEFT JOIN asset_ownerships ao ON ao.asset_id = a.id AND ao.active = true
      WHERE a.current_owner_id != ao.owner_id OR ao.owner_id IS NULL
    `);

    for (const orphan of ownershipOrphans.rows) {
      try {
        console.warn(`[RECOVERY_MISMATCH] Detected ownership divergence for asset ${orphan.asset_id}`);
        
        await db.withTransaction(async (tx) => {
          // Lock the asset for forensic repair
          await tx.query('SELECT * FROM assets WHERE id = $1 FOR UPDATE', [orphan.asset_id]);
          
          if (!orphan.active_record_owner) {
            // Restore from latest inactive record if any
            const lastRecord = await tx.query('SELECT owner_id FROM asset_ownerships WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1', [orphan.asset_id]);
            if (lastRecord.rowCount > 0) {
              const restoredOwner = lastRecord.rows[0].owner_id;
              console.log(`[RECOVERY_HEAL] Restoring active ownership for asset ${orphan.asset_id} to user ${restoredOwner}`);
              await tx.query("UPDATE asset_ownerships SET active = true WHERE asset_id = $1 AND owner_id = $2", [orphan.asset_id, restoredOwner]);
              await tx.query("UPDATE assets SET current_owner_id = $1 WHERE id = $2", [restoredOwner, orphan.asset_id]);
              await logAudit('OWNERSHIP_REPAIRED', 'f5000000-0000-0000-0000-000000000001', orphan.asset_id, { type: 'RESTORE_ACTIVE_RECORD', owner: restoredOwner }, tx);
              
              const { notifyService } = require('../config/notificationHelper');
              await notifyService({
                event_type: 'INTEGRITY_FAILURE',
                payload_json: { message: `Ownership mismatch: Restored active ownership for asset ${orphan.asset_id} to user ${restoredOwner}.` },
                category: 'security'
              });
            } else {
              console.error(`[CRITICAL_FORENSIC_VOID] Asset ${orphan.asset_id} has NO ownership history!`);
              const { notifyService } = require('../config/notificationHelper');
              await notifyService({
                event_type: 'INTEGRITY_FAILURE',
                payload_json: { message: `Critical Forensic Void: Asset ${orphan.asset_id} has no active/inactive ownership record!` },
                category: 'security'
              });
            }
          } else {
            // Mismatch: sync current owner to active record
            console.log(`[RECOVERY_HEAL] Correcting asset.current_owner_id for ${orphan.asset_id} to match active record: ${orphan.active_record_owner}`);
            await tx.query("UPDATE assets SET current_owner_id = $1 WHERE id = $2", [orphan.active_record_owner, orphan.asset_id]);
            await logAudit('OWNERSHIP_REPAIRED', 'f5000000-0000-0000-0000-000000000001', orphan.asset_id, { type: 'SYNC_CURRENT_OWNER', owner: orphan.active_record_owner }, tx);
            
            const { notifyService } = require('../config/notificationHelper');
            await notifyService({
              event_type: 'INTEGRITY_FAILURE',
              payload_json: { message: `Ownership repair mismatch: Syncing current owner for asset ${orphan.asset_id} to match active record owner ${orphan.active_record_owner}.` },
              category: 'security'
            });
          }
        });
      } catch (err) {
        console.error(`[RECOVERY_HEAL_FAILED] Asset ${orphan.asset_id}:`, err.message);
      }
    }

    // 3. Repair Active Status Logic Mismatch (active=true but end_date is set)
    const statusMismatches = await db.query(`
      UPDATE asset_ownerships 
      SET active = false 
      WHERE active = true AND end_date IS NOT NULL
      RETURNING id, asset_id
    `);
    if (statusMismatches.rowCount > 0) {
      console.log(`[RECOVERY_HEAL] Closed ${statusMismatches.rowCount} stale active records with end_dates.`);
    }

  } catch (err) {
    console.error('[RECOVERY_WORKER_ERROR]', err);
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'RECOVERY_WORKER_FAILURE',
        payload_json: { message: `Recovery worker failure: ${err.message}` },
        category: 'security'
      });
    } catch (notifyErr) {
      console.error('Failed to notify recovery worker error:', notifyErr.message);
    }
  }
  console.log('--- [RECOVERY_WORKER_END] ---');
};

module.exports = { runRecoveryWorker };
