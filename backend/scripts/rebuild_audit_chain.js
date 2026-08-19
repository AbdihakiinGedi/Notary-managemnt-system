const db = require('../config/db');
const crypto = require('crypto');

const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

async function rebuildAuditChain() {
  console.log('--- [REBUILD_AUDIT_CHAIN_START] ---');
  try {
    await db.withTransaction(async (tx) => {
      console.log('Locking audit_logs table...');
      await tx.query('LOCK TABLE audit_logs IN EXCLUSIVE MODE');

      const result = await tx.query('SELECT * FROM audit_logs ORDER BY sequential_id ASC');
      let prevHash = '0'.repeat(64);

      console.log(`Rebuilding hashes for ${result.rowCount} audit logs...`);
      for (const row of result.rows) {
        // Parse metadata as an object since the DB might return a string or JSON depending on driver config
        let metadata = row.metadata;
        if (typeof metadata === 'string') {
          try { metadata = JSON.parse(metadata); } catch (e) { metadata = {}; }
        }

        // Must strictly match auditLogger.js signature: canonicalize({ action, userId, propId, metadata })
        const recordData = canonicalize({ 
            action: row.action, 
            userId: row.user_id, 
            propId: row.affected_property_id, 
            metadata: metadata 
        });

        const currentHash = crypto.createHash('sha256').update(prevHash + recordData).digest('hex');

        await tx.query(
          `UPDATE audit_logs SET previous_hash = $1, current_hash = $2 WHERE id = $3`,
          [prevHash, currentHash, row.id]
        );

        prevHash = currentHash;
      }
    });

    console.log('[AUDIT_CHAIN_REBUILT]');
    process.exit(0);
  } catch (err) {
    console.error('Failed to rebuild audit chain:', err);
    process.exit(1);
  }
}

rebuildAuditChain();
