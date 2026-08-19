const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { safeExecute } = require('../middleware/systemMiddleware');
const notificationService = require('../services/notificationService');

// System Monitoring Metrics
router.get('/settings', authenticate, authorize('admin'), async (req, res) => {
  try {
    const dbRes = await db.query('SELECT version();');
    const pgVersion = dbRes.rows[0].version.split(' ')[1];
    
    return res.json({
      systemName: 'SNDNPRS',
      systemStatus: 'Operational',
      maintenanceMode: false,
      sessionTimeout: '8 hours',
      maxLoginAttempts: '3 attempts',
      auditLogging: true,
      nationalIdRequired: true,
      citizenVerification: true,
      transferProfilePhoto: false,
      maxUploadSize: '10 MB',
      allowedFormats: 'JPEG, PNG, WebP, PDF',
      pdfGeneration: true,
      qrVerification: true,
      realTimeNotifications: true,
      registrationNotifications: true,
      transferNotifications: true,
      appVersion: '1.0.0-production',
      nodeVersion: process.version,
      pgVersion: `PostgreSQL ${pgVersion}`
    });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.get('/metrics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const userCount = await db.query("SELECT COUNT(*) FROM users WHERE is_active = true");
    const assetCount = await db.query("SELECT COUNT(*) FROM properties WHERE status IN ('ACTIVE', 'registered')");
    const certificateCount = await db.query("SELECT COUNT(*) FROM asset_certificates WHERE status = 'valid'");
    const transferCount = await db.query("SELECT COUNT(*) FROM ownership_transfers WHERE status = 'completed' AND created_at > NOW() - INTERVAL '24 hours'");
    const failedCount = await db.query("SELECT COUNT(*) FROM audit_logs WHERE status_code >= 400 AND created_at > NOW() - INTERVAL '24 hours'");
    
    // DB Health Check
    const startTime = Date.now();
    await db.query("SELECT 1");
    const latency = Date.now() - startTime;

    const trafficRes = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon DD') as date,
        COUNT(*) as requests,
        SUM(CASE WHEN action ILIKE '%login%' OR status_code >= 400 THEN 1 ELSE 0 END) as security
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY TO_CHAR(created_at, 'Mon DD'), DATE(created_at)
      ORDER BY DATE(created_at) ASC
    `);

    return res.json({
      activeUsers: parseInt(userCount.rows[0].count),
      activeAssets: parseInt(assetCount.rows[0].count),
      activeCertificates: parseInt(certificateCount.rows[0].count),
      transferVolume24h: parseInt(transferCount.rows[0].count),
      failedTransactions24h: parseInt(failedCount.rows[0].count),
      databaseLatency: `${latency}ms`,
      systemStatus: 'Operational',
      registryIntegrity: 'Secure',
      trafficData: trafficRes.rows
    });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

const { logAudit: centralLogAudit } = require('../utils/auditLogger');
const logAudit = async (data) => {
  await centralLogAudit(data.action, data.user_id, null, data.metadata);
};

// System Health
router.get('/health', authenticate, authorize('admin'), async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    
    // Test DB connection and get version
    const dbRes = await db.query('SELECT version();');
    const pgVersion = dbRes.rows[0].version.split(' ')[1];
    
    // Get DB size
    const sizeRes = await db.query("SELECT pg_size_pretty(pg_database_size(current_database())) as size");
    const dbSize = sizeRes.rows[0].size;

    return res.json({
      status: 'healthy',
      uptime,
      memory: {
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
        rss: Math.round(mem.rss / 1024 / 1024) + ' MB'
      },
      database: {
        status: 'connected',
        version: `PostgreSQL ${pgVersion}`,
        size: dbSize
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: 'Database disconnected or system error' });
  }
});

// List Users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  console.log('ADMIN_HIT >> GET /users');
  try {
    const result = await db.query(
      `SELECT u.id, u.full_name, u.email, u.is_active, u.account_status as verification_status, u.verification_document as id_document_url, u.verification_type, u.verification_number, u.rejection_reason, u.profile_photo, r.name as role 
       FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Provision User (POST /api/admin/users)
router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  const { full_name, email, password, role_name, national_id, phone } = req.body;
  if (!national_id || national_id.trim() === '') {
    return res.status(400).json({ error: 'National ID is mandatory' });
  }
  try {
    const user = await db.withTransaction(async (tx) => {
      const roleRes = await tx.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleRes.rowCount === 0) throw new Error('Operation failed');
      
      const hash = await bcrypt.hash(password, 10);
      const result = await tx.query(
        `INSERT INTO users (full_name, email, password_hash, role_id, national_id, phone, account_status, verification_status, verified) 
         VALUES ($1, $2, $3, $4, $5, $6, 'verified', 'verified', true) RETURNING id, email`,
        [full_name, email, hash, roleRes.rows[0].id, national_id, phone || null]
      );
      if (result.rowCount !== 1) throw new Error('Operation failed');
      return result.rows[0];
    });

    safeExecute(() => logAudit({ user_id: req.user.id, action: 'USER_PROVISIONED', metadata: { target_email: email, role: role_name } }))();
    
    if (['notary', 'officer'].includes(role_name.toLowerCase())) {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'NEW_STAFF_ACCOUNT',
        actor_id: req.user.id,
        payload_json: { role: role_name }
      });
    }

    return res.status(201).json(user);
  } catch (err) {
    console.error('[ADMIN USER CREATE ERROR]', err.message);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Update User Activation Status
router.patch('/users/:id/activation', authenticate, authorize('admin'), async (req, res) => {
  const { is_active } = req.body;
  try {
    const user = await db.withTransaction(async (tx) => {
      const targetRes = await tx.query('SELECT u.id, u.is_active, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1 FOR UPDATE', [req.params.id]);
      if (targetRes.rowCount === 0) throw new Error('User not found');
      
      const targetUser = targetRes.rows[0];
      
      if (targetUser.role === 'admin') {
        throw new Error('You cannot deactivate administrator accounts.');
      }

      if (targetUser.id === req.user.id) {
        throw new Error('You cannot deactivate your own account.');
      }

      const newStatus = is_active ? 'ACTIVE' : 'DEACTIVATED';

      const updateRes = await tx.query(
        `UPDATE users SET is_active = $1, status = $2 WHERE id = $3 RETURNING id, email`,
        [is_active, newStatus, req.params.id]
      );
      
      const action = is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
      await centralLogAudit(action, req.user.id, null, { target_user: req.params.id });
      
      return updateRes.rows[0];
    });

    notificationService.sendUserActivation(user, is_active).catch(console.error);

    // Trigger Notification Engine for DB + Socket
    const { notifyService } = require('../config/notificationHelper');
    notifyService({
        event_type: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        actor_id: req.user.id,
        payload_json: { target_user: req.params.id }
    }).catch(console.error);

    return res.json({ message: 'User activation status updated', user });
  } catch (err) {
    if (err.message.includes('cannot deactivate')) {
      return res.status(403).json({ error: err.message });
    }
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Update User Verification Status
router.patch('/users/:id/verify', authenticate, authorize('admin'), async (req, res) => {
  const { status, rejection_reason } = req.body; // 'verified' or 'rejected'
  if (!['verified', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid verification status' });
  }

  try {
    const isApproved = status === 'verified';
    const dbStatus = isApproved ? 'approved' : (status === 'rejected' ? 'rejected' : 'pending');

    const result = await db.query(
      `UPDATE users 
       SET account_status = $1, 
           verified = $2, 
           approved_by = $3, 
           approved_at = CASE WHEN $2 = true THEN NOW() ELSE NULL END,
           rejection_reason = $4
       WHERE id = $5 
       RETURNING id, full_name, email, account_status as verification_status`,
      [dbStatus, isApproved, isApproved ? req.user.id : null, status === 'rejected' ? rejection_reason : null, req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];

    await centralLogAudit(`USER_${dbStatus.toUpperCase()}`, req.user.id, null, { target_user: user.id });

    // Try to send email notification
    try {
      const emailService = require('../services/emailService');
      const { notifyService } = require('../config/notificationHelper');
      
      if (isApproved) {
        await emailService.sendApprovalEmail(user);
        notifyService({
          event_type: 'ACCOUNT_APPROVED',
          actor_id: req.user.id,
          payload_json: { target_user: user.id }
        }).catch(console.error);
      } else if (status === 'rejected') {
        await emailService.sendRejectionEmail(user, rejection_reason);
        notifyService({
          event_type: 'ACCOUNT_REJECTED',
          actor_id: req.user.id,
          payload_json: { target_user: user.id, rejection_reason }
        }).catch(console.error);
      }
    } catch (e) {
      console.error('Email sending failed:', e);
    }

    return res.json({ message: 'Verification status updated', user });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Audit Logs
router.get('/logs', authenticate, authorize('admin'), async (req, res) => {
  console.log('ADMIN_HIT >> GET /logs');
  try {
    const result = await db.query(
      `SELECT l.*, COALESCE(u.full_name, 'System Authority') as acting_user, 
              COALESCE(p.title, p2.title, p3.title, p4.title, p5.title) as related_property,
              REPLACE(INITCAP(l.action), '_', ' ') as description
       FROM audit_logs l 
       LEFT JOIN users u ON l.user_id = u.id 
       LEFT JOIN properties p ON l.affected_property_id = p.id::text
       LEFT JOIN ownership_transfers t ON t.id::text = l.metadata->>'transfer_id'
       LEFT JOIN properties p2 ON p2.id = t.property_id
       LEFT JOIN transfer_agreements ta ON ta.id::text = l.metadata->>'agreement_id'
       LEFT JOIN ownership_transfers t3 ON t3.id = ta.transfer_id
       LEFT JOIN properties p3 ON p3.id = t3.property_id
       LEFT JOIN properties p4 ON p4.id::text = l.metadata->>'property_id'
       LEFT JOIN notary_certificates nc ON nc.id::text = l.metadata->>'certificate_id'
       LEFT JOIN ownership_transfers t4 ON t4.notary_request_id = nc.request_id
       LEFT JOIN properties p5 ON p5.id = t4.property_id
       ORDER BY l.created_at DESC LIMIT 200`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// --- SOVEREIGN DEMO RESET (DETERMINISTIC STATE RECOVERY) ---
router.post('/reset', authenticate, authorize('admin'), async (req, res) => {
  try {
    await db.withTransaction(async (tx) => {
      await tx.query('TRUNCATE ownership_transfers, audit_logs CASCADE');
      const citizen = await tx.query(`SELECT u.id FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'citizen' LIMIT 1`);
      if (citizen.rowCount > 0) {
        await tx.query("UPDATE properties SET owner_id = $1, status = 'verified'", [citizen.rows[0].id]);
      }
    });
    return res.json({ status: "success", message: 'Institutional State Reverted' });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Forensic Ledger Events
router.get('/events', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, COALESCE(u.full_name, 'System') as actor_name 
       FROM event_log e 
       LEFT JOIN users u ON e.actor_id = u.id 
       ORDER BY e.created_at DESC LIMIT 200`
    );
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Ledger Integrity Check
const { verifyLedger } = require('../utils/eventLedger');
router.get('/ledger/verify', authenticate, authorize('admin'), async (req, res) => {
  try {
    const integrity = await verifyLedger();
    return res.json(integrity);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Audit Logs
router.get('/audit', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { limit = 100, page = 1, action, user } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT a.*, u.full_name as user_name, r.name as role_name,
             COALESCE(p.title, p2.title, p3.title, p4.title, p5.title) as related_property,
             REPLACE(INITCAP(a.action), '_', ' ') as description
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN properties p ON a.affected_property_id = p.id::text
      LEFT JOIN ownership_transfers t ON t.id::text = a.metadata->>'transfer_id'
      LEFT JOIN properties p2 ON p2.id = t.property_id
      LEFT JOIN transfer_agreements ta ON ta.id::text = a.metadata->>'agreement_id'
      LEFT JOIN ownership_transfers t3 ON t3.id = ta.transfer_id
      LEFT JOIN properties p3 ON p3.id = t3.property_id
      LEFT JOIN properties p4 ON p4.id::text = a.metadata->>'property_id'
      LEFT JOIN notary_certificates nc ON nc.id::text = a.metadata->>'certificate_id'
      LEFT JOIN ownership_transfers t4 ON t4.notary_request_id = nc.request_id
      LEFT JOIN properties p5 ON p5.id = t4.property_id
      WHERE 1=1
    `;
    const params = [];
    
    if (action) {
      params.push(`%${action}%`);
      query += ` AND a.action ILIKE $${params.length}`;
    }
    
    if (user) {
      params.push(`%${user}%`);
      query += ` AND u.full_name ILIKE $${params.length}`;
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    const result = await db.query(query, [...params, limit, offset]);
    
    let countQuery = `
      SELECT COUNT(*) 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      WHERE 1=1
    `;
    const countParams = [];
    
    if (action) {
      countParams.push(`%${action}%`);
      countQuery += ` AND a.action ILIKE $${countParams.length}`;
    }
    if (user) {
      countParams.push(`%${user}%`);
      countQuery += ` AND u.full_name ILIKE $${countParams.length}`;
    }
    
    const countResult = await db.query(countQuery, countParams);
    
    return res.json({
      success: true,
      total: parseInt(countResult.rows[0].count, 10),
      data: result.rows
    });
  } catch (err) {
    console.error('[ADMIN_AUDIT_ROUTE_ERROR]', err);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
