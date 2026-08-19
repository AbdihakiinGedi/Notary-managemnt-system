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

const runIntegrityCheck = async () => {
  console.log('--- [SYSTEM_INTEGRITY_CHECK_START] ---');
  try {
    const report = {
      timestamp: new Date().toISOString(),
      issues: []
    };

    // 0. Verify Anchor Continuity (#1)
    const lastAnchor = await db.query('SELECT state_hash FROM global_anchors ORDER BY created_at DESC LIMIT 1');
    const prevTruth = lastAnchor.rowCount > 0 ? lastAnchor.rows[0].state_hash : null;

    // 1. Verify Audit Chain (#2)
    const auditLogs = await db.query('SELECT sequential_id, previous_hash, current_hash, action, user_id, affected_property_id, metadata FROM audit_logs ORDER BY sequential_id ASC');
    let lastHash = '0'.repeat(64);
    let lastId = 0;

    for (const log of auditLogs.rows) {
      const currentId = parseInt(log.sequential_id);
      if (lastId > 0 && currentId !== lastId + 1) {
        report.issues.push(`AUDIT_GAP: Missing sequential ID between ${lastId} and ${currentId}`);
      }

      // 4. Deterministic Re-computation (#4)
      const recordData = canonicalize({ 
        action: log.action, 
        userId: log.user_id, 
        propId: log.affected_property_id, 
        metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata 
      });
      const computedHash = crypto.createHash('sha256').update(log.previous_hash + recordData).digest('hex');

      if (computedHash !== log.current_hash) {
        report.issues.push(`AUDIT_TAMPER: Hash mismatch at ID ${currentId}`);
      }
      if (log.previous_hash !== lastHash) {
        report.issues.push(`AUDIT_CHAIN_BREAK: Chain broken at ID ${currentId}`);
      }

      lastHash = log.current_hash;
      lastId = currentId;
    }

    // 2. Verify Certificates (#5)
    const certificates = await db.query('SELECT id, certificate_hash, certificate_json FROM asset_certificates');
    for (const cert of certificates.rows) {
      const computedHash = crypto.createHash('sha256').update(canonicalize(cert.certificate_json)).digest('hex');
      if (computedHash !== cert.certificate_hash) {
        report.issues.push(`CERTIFICATE_TAMPER: Integrity failure for cert ${cert.id}`);
      }
    }

    // 3. Compute Global State Hash (#1)
    const stateInput = lastHash + (certificates.rows.map(c => c.certificate_hash).sort().join(''));
    const globalStateHash = crypto.createHash('sha256').update(stateInput).digest('hex');

    // 0b. Continuity Check (#1)
    if (prevTruth && globalStateHash !== prevTruth) {
       report.issues.push(`CRITICAL_HISTORY_REWRITE_ATTACK: Global state hash divergence detected.`);
    }

    // 4. Anchor Globally (#1) + Versioning (#8)
    const schemaVersion = 1;
    const systemVersion = '1.1.0';
    
    await db.query(
      'INSERT INTO global_anchors (state_hash, metadata, schema_version, system_version) VALUES ($1, $2, $3, $4)',
      [globalStateHash, JSON.stringify({ audit_last_id: lastId, issues_count: report.issues.length }), schemaVersion, systemVersion]
    );

    // 5. File Commit Reconciliation (#1)
    const staleCommits = await db.query("SELECT id, file_path FROM file_commits WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'");
    for (const sc of staleCommits.rows) {
      report.issues.push(`STALE_FILE_COMMIT: Pending file commit detected for ${sc.id} (${sc.file_path})`);
    }

    const anchorPath = path.join(__dirname, '../global_anchors.log');
    fs.appendFileSync(anchorPath, `[${report.timestamp}] STATE_HASH: ${globalStateHash} | ISSUES: ${report.issues.length} | VER: ${systemVersion}\n`);

    if (report.issues.length > 0) {
      // 9. Critical Alert Channel (#9)
      console.error('[CRITICAL_INTEGRITY_FAILURE]', report.issues);
      // In production, this would trigger an SNS/PagerDuty/Email alert
      try {
        const { notifyService } = require('../config/notificationHelper');
        await notifyService({
          event_type: 'INTEGRITY_FAILURE',
          payload_json: { message: `Critical integrity failures detected: ${report.issues.join('; ')}` },
          category: 'security'
        });
      } catch (notifyErr) {
        console.error('Failed to dispatch integrity alert:', notifyErr.message);
      }
    } else {
      console.log('[INTEGRITY_PASSED] Global State Hash:', globalStateHash);
    }

  } catch (err) {
    console.error('[INTEGRITY_JOB_ERROR]', err.message);
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'INTEGRITY_FAILURE',
        payload_json: { message: `Integrity Job execution error: ${err.message}` },
        category: 'security'
      });
    } catch (notifyErr) {
      console.error('Failed to dispatch integrity job error alert:', notifyErr.message);
    }
  }
  console.log('--- [SYSTEM_INTEGRITY_CHECK_END] ---');
};

module.exports = { runIntegrityCheck };
