const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const authMiddleware = authenticate;
const crypto = require('crypto');

// GET /api/assets/timeline/:assetId - Forensic Ownership Timeline
router.get('/timeline/:assetId', authenticate, async (req, res) => {
  try {
    const { assetId } = req.params;

    // 1. Fetch asset core info
    const assetRes = await db.query('SELECT * FROM assets WHERE id = $1', [assetId]);
    if (assetRes.rowCount === 0) return res.status(404).json({ error: 'Asset not found' });
    const asset = assetRes.rows[0];

    // 2. Aggregate timeline from multiple sources:
    // a) audit_logs (System actions)
    // b) asset_transfers (Migration steps)
    // c) asset_ownerships (State changes)
    
    const timelineQuery = `
      (
        SELECT 
          'AUDIT' as source,
          created_at as timestamp,
          action as event,
          user_id as actor_id,
          (SELECT full_name FROM users WHERE id = user_id) as actor_name,
          (SELECT name FROM roles WHERE id = (SELECT role_id FROM users WHERE id = user_id)) as actor_role,
          metadata->>'request_id' as reference_id,
          'completed' as status
        FROM audit_logs 
        WHERE affected_property_id = $1 OR (metadata->>'asset_id' = $1::text)
      )
      UNION ALL
      (
        SELECT 
          'TRANSFER' as source,
          created_at as timestamp,
          'TRANSFER_INITIATED' as event,
          from_user as actor_id,
          (SELECT full_name FROM users WHERE id = from_user) as actor_name,
          'citizen' as actor_role,
          id::text as reference_id,
          status::text as status
        FROM ownership_transfers
        WHERE property_id::text = (SELECT reference_id FROM assets WHERE id = $1)
      )
      UNION ALL
      (
        SELECT 
          'OWNERSHIP' as source,
          start_date as timestamp,
          'OWNERSHIP_ACQUIRED' as event,
          owner_id as actor_id,
          (SELECT full_name FROM users WHERE id = owner_id) as actor_name,
          'citizen' as actor_role,
          transfer_id::text as reference_id,
          'active' as status
        FROM asset_ownerships
        WHERE asset_id = $1
      )
      ORDER BY timestamp DESC
    `;

    const timeline = await db.query(timelineQuery, [assetId]);

    res.json({
      asset,
      timeline: timeline.rows
    });
  } catch (err) {
    console.error('[TIMELINE_ERROR]', err.message);
    res.status(500).json({ error: 'System unavailable' });
  }
});

// GET /api/assets/certificates - Unified Certificates List
router.get('/certificates', authenticate, async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    let query = `
      SELECT c.*, p.title as property_title, p.type as property_type, u.full_name as owner_name
      FROM asset_certificates c
      JOIN properties p ON c.property_id = p.id
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.status = 'valid'
    `;
    let params = [];

    if (userRole === 'citizen') {
      query = `
        SELECT c.*, p.title as property_title, p.type as property_type, u.full_name as owner_name
        FROM asset_certificates c
        JOIN properties p ON c.property_id = p.id
        LEFT JOIN users u ON c.owner_id = u.id
        JOIN asset_ownerships ao ON c.property_id = ao.asset_id AND ao.owner_id = c.owner_id AND ao.active = true
        WHERE c.owner_id = $1 AND c.status = 'valid'
      `;
      params.push(req.user.id);
    } else if (userRole === 'notary') {
      query += ` AND c.notary_id = $1`;
      params.push(req.user.id);
    }

    query += ` ORDER BY c.issued_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'System unavailable' });
  }
});

// GET /api/assets/certificates/:id/pdf - Stream certificate PDF
router.get('/certificates/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure certificate IDs are UUID-safe and passed correctly.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid certificate ID format' });
    }

    // Validate certificate query: Use exact SQL
    const certQuery = await db.query(
      `SELECT *
FROM asset_certificates
WHERE id = $1`,
      [id]
    );

    // If certificate not found:
    if (certQuery.rowCount === 0) {
      return res.status(404).json({
        error: 'Certificate not found'
      });
    }

    const certificate = certQuery.rows[0];

    // Ensure authorized access (citizen only sees their own, others like notary/officer/admin can see any)
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'citizen' && certificate.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure response headers:
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=certificate-${certificate.id}.pdf`
    );

    const { generateCertificatePDF } = require('../services/pdfService');
    await generateCertificatePDF(id, res);
  } catch (err) {
    // Add backend logs:
    console.error('[CERTIFICATE_PDF_ERROR]', err);
    res.status(500).json({ error: 'Failed to download PDF certificate' });
  }
});

// GET /api/assets/transfers - Unified Transfer List
router.get('/transfers', authenticate, async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    const userId = req.user.id;
    let sql = `
      SELECT t.*, p.type as asset_type, p.title as property_title, 
             u1.full_name as seller_name, u2.full_name as buyer_name,
             u3.full_name as notary_name,
             (SELECT u.full_name FROM digital_signatures ds JOIN users u ON ds.user_id = u.id WHERE ds.agreement_id = ta.id AND ds.role = 'officer' LIMIT 1) as officer_name
      FROM ownership_transfers t
      JOIN properties p ON t.property_id = p.id
      JOIN users u1 ON t.from_user = u1.id
      JOIN users u2 ON t.to_user = u2.id
      LEFT JOIN users u3 ON t.notary_request_id = u3.id
      LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
    `;
    const params = [];

    if (userRole === 'citizen') {
      sql += ` WHERE t.from_user = $1 OR t.to_user = $1`;
      params.push(userId);
    } else if (userRole === 'notary') {
      sql += ` WHERE t.status IN ('accepted', 'completed', 'pending_officer')`;
    } else if (userRole === 'officer') {
      sql += ` WHERE LOWER(p.type) IN ('land', 'residential', 'commercial', 'industrial') AND t.status IN ('pending_officer', 'completed')`;
    }

    sql += ` ORDER BY t.created_at DESC`;
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'System unavailable' });
  }
});

// GET /api/assets/my-assets - Active Citizen Holdings
router.get('/my-assets', authenticate, authorize('citizen'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, p.title, p.address, p.district, p.type as asset_type, p.status as status, u.full_name as owner_name
      FROM assets a
      JOIN properties p ON a.reference_id = p.id::text
      JOIN users u ON a.current_owner_id = u.id
      WHERE a.current_owner_id = $1 AND a.status = 'active'
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'System unavailable' });
  }
});

// POST /api/assets/register - Universal Asset Registration (Internal/Legacy)
router.post('/register', authenticate, async (req, res) => {
  const { type, reference_id, metadata } = req.body;
  if (!type || !reference_id) return res.status(400).json({ error: 'Missing mandatory fields' });

  try {
    const assetId = await db.withTransaction(async (tx) => {
      // 1. Create Asset
      const assetRes = await tx.query(
        'INSERT INTO assets (type, reference_id, current_owner_id, metadata) VALUES ($1, $2, $3, $4) RETURNING id',
        [type, reference_id, req.user.id, JSON.stringify(metadata || {})]
      );
      const aid = assetRes.rows[0].id;

      // 2. Create Initial Ownership Record
      await tx.query(
        'INSERT INTO asset_ownerships (asset_id, owner_id, active) VALUES ($1, $2, true)',
        [aid, req.user.id]
      );

      return aid;
    });

    res.json({ success: true, assetId });
  } catch (err) {
    console.error('[REGISTER_ERROR]', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
