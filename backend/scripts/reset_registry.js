require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');

async function resetRegistry() {
  console.log('[RESET] Starting database reset...');
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Tables to truncate
    const operationalTables = [
      'approvals', 'asset_certificates', 'asset_locks', 'asset_ownerships', 'asset_transfers', 'assets',
      'audit_dead_letter', 'audit_logs', 'completed_actions', 'digital_signatures', 'documents',
      'event_log', 'file_commits', 'global_anchors', 'idempotency_ledger', 'login_logs',
      'notary_actions', 'notary_certificates', 'notary_documents', 'notary_participants',
      'notary_requests', 'notifications', 'ownership_history', 'ownership_transfers',
      'payments', 'profile_history', 'properties', 'request_idempotency', 'revenues',
      'system_snapshot_log', 'transfer_agreements', 'transfers', 'user_fraud_flags'
    ];
    
    // Perform TRUNCATE with RESTART IDENTITY to reset sequences
    const truncateQuery = `TRUNCATE TABLE ${operationalTables.join(', ')} RESTART IDENTITY CASCADE;`;
    console.log(`[RESET] Executing TRUNCATE on ${operationalTables.length} tables...`);
    await client.query(truncateQuery);
    
    // Drop the unused court_cases table completely
    console.log('[RESET] Dropping unused table court_cases...');
    await client.query('DROP TABLE IF EXISTS court_cases CASCADE;');
    
    await client.query('COMMIT');
    console.log('[RESET] Database reset successfully completed!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RESET] Error resetting database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

resetRegistry();
