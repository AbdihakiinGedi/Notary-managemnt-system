const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');

const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

// 4. DEFENSE AGAINST PRIVILEGED INSIDER - Public Verification Endpoint (#4)
router.get('/verify/:certificate_id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, p.type as asset_type, p.title as property_title, u.full_name as owner_name, p.visibility
       FROM asset_certificates c 
       JOIN properties p ON c.property_id = p.id 
       JOIN users u ON c.owner_id = u.id
       WHERE c.id = $1`,
      [req.params.certificate_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ valid: false, status: 'INVALID', error: "Record Not Found" });
    }

    const cert = result.rows[0];
    if (cert.visibility === 'private') {
      return res.status(404).json({ valid: false, status: 'INVALID', error: "This property is private." });
    }
    const computedHash = crypto.createHash('sha256').update(canonicalize(cert.certificate_json)).digest('hex');
    const isIntegrityValid = computedHash === cert.certificate_hash;
    const isNotRevoked = (cert.status || 'valid').toLowerCase() === 'valid';

    if (!isIntegrityValid) {
      console.error(`[CRITICAL_TAMPER_DETECTED_PUBLIC] Cert: ${cert.id}`);
    }

    return res.json({
      valid: isIntegrityValid && isNotRevoked,
      status: !isIntegrityValid ? 'TAMPERED' : (!isNotRevoked ? 'Certificate Superseded By New Ownership Record' : 'VERIFIED'),
      asset_type: cert.asset_type,
      property_title: cert.property_title,
      owner_name: cert.owner_name,
      issued_at: cert.issued_at,
      metadata: {
        certificate_hash: cert.certificate_hash,
        verification_status: isIntegrityValid ? "Ownership Confirmed" : "Integrity Failure"
      }
    });
  } catch (err) {
    console.error('[PUBLIC_VERIFY_ERROR]', err.message);
    return res.status(500).json({ valid: false, error: "System unavailable" });
  }
});

// GET /api/public/certificates/:id/verify - Secure Verification with Signatures
router.get('/certificates/:id/verify', async (req, res) => {
  try {
    const searchTerm = req.params.id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    let sqlCondition;
    if (uuidRegex.test(searchTerm)) {
      sqlCondition = `c.id = $1 OR c.property_id = $1`;
    } else {
      sqlCondition = `c.certificate_hash = $1`;
    }

    const result = await db.query(
      `SELECT c.*, p.type as asset_type, p.title as property_title, p.district, u.full_name as owner_name, p.visibility
       FROM asset_certificates c 
       JOIN properties p ON c.property_id = p.id 
       JOIN users u ON c.owner_id = u.id
       WHERE ${sqlCondition}`,
      [searchTerm]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ valid: false, status: 'INVALID', error: "Record Not Found" });
    }

    const cert = result.rows[0];
    if (cert.visibility === 'private') {
      return res.status(404).json({ valid: false, status: 'INVALID', error: "This property is private." });
    }
    const computedHash = crypto.createHash('sha256').update(canonicalize(cert.certificate_json)).digest('hex');
    const isIntegrityValid = computedHash === cert.certificate_hash;
    const isNotRevoked = (cert.status || 'valid').toLowerCase() === 'valid';

    if (!isIntegrityValid) {
      console.error(`[CRITICAL_TAMPER_DETECTED_PUBLIC] Cert: ${cert.id}`);
    }

    // Fetch Signatures
    const signatures = [];
    if (cert.transfer_id) {
      const agrRes = await db.query('SELECT id FROM transfer_agreements WHERE transfer_id = $1', [cert.transfer_id]);
      if (agrRes.rowCount > 0) {
        const sRes = await db.query('SELECT role, signed_at, u.full_name FROM digital_signatures ds JOIN users u ON ds.user_id = u.id WHERE ds.agreement_id = $1', [agrRes.rows[0].id]);
        sRes.rows.forEach(s => signatures.push({ role: s.role, name: s.full_name, timestamp: s.signed_at, verified: true }));
      }
    } else if (cert.property_id) {
      const sRes = await db.query('SELECT role, signed_at, u.full_name FROM digital_signatures ds JOIN users u ON ds.user_id = u.id WHERE ds.property_id = $1', [cert.property_id]);
      sRes.rows.forEach(s => signatures.push({ role: s.role, name: s.full_name, timestamp: s.signed_at, verified: true }));
    }

    return res.json({
      valid: isIntegrityValid && isNotRevoked,
      status: !isIntegrityValid ? 'TAMPERED' : (!isNotRevoked ? 'Certificate Superseded By New Ownership Record' : 'ACTIVE'),
      certificate_id: cert.id,
      asset_type: cert.asset_type,
      property_title: cert.property_title,
      district: cert.district,
      owner_name: cert.owner_name,
      issued_at: cert.issued_at,
      metadata: {
        certificate_hash: cert.certificate_hash,
        verification_status: isIntegrityValid ? "Ownership Confirmed" : "Integrity Validation Failed"
      },
      signatures: signatures
    });
  } catch (err) {
    console.error('[PUBLIC_VERIFY_ERROR]', err.message);
    return res.status(500).json({ valid: false, error: "System unavailable" });
  }
});

// GET /api/public/verify/:id/pdf - Public dynamic PDF certificate stream
router.get('/verify/:id/pdf', async (req, res) => {
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

// Verification by JSON Upload
router.post('/verify/json', async (req, res) => {
  try {
    const { certificate_json, certificate_hash, id } = req.body;
    if (!certificate_json || !certificate_hash || !id) {
      return res.status(400).json({ valid: false, error: "Malformed certificate JSON" });
    }

    // 1. Recompute Hash (Forensic Integrity #10)
    const computedHash = crypto.createHash('sha256').update(canonicalize(certificate_json)).digest('hex');
    if (computedHash !== certificate_hash) {
       return res.json({ valid: false, status: 'TAMPERED', error: "Local hash mismatch" });
    }

    // 2. Cross-Verify with Ledger
    const result = await db.query('SELECT status, certificate_hash FROM asset_certificates WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.json({ valid: false, status: 'INVALID', error: "Record not found in national registry" });
    }

    const cert = result.rows[0];
    const isSyncValid = cert.certificate_hash === certificate_hash;
    const isNotRevoked = (cert.status || 'valid').toLowerCase() === 'valid';

    return res.json({
      id: id,
      valid: isSyncValid && isNotRevoked,
      status: !isSyncValid ? 'TAMPERED' : (!isNotRevoked ? 'Certificate Superseded By New Ownership Record' : 'VERIFIED'),
      asset_type: certificate_json.property?.type,
      property_title: certificate_json.property?.title,
      owner_name: certificate_json.owner?.name,
      issued_at: certificate_json.issued_at,
      metadata: {
        certificate_hash: cert.certificate_hash,
        verification_status: isSyncValid ? "Ownership Confirmed" : "Integrity Failure"
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "System unavailable" });
  }
});



// GET /api/public/search
router.get('/search', async (req, res) => {
  try {
    const { query, type, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT p.id, p.title, p.address, p.district, u.full_name as owner_name,
             p.status, p.type, ac.id as certificate_id, ac.certificate_hash
      FROM properties p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN asset_certificates ac ON p.id = ac.property_id AND ac.status = 'valid'
      WHERE p.visibility = 'public'
    `;
    const params = [];

    if (query) {
      const pIdx = params.length + 1;
      sql += ` AND (
        p.id::text ILIKE $${pIdx} OR 
        ac.id::text ILIKE $${pIdx} OR
        p.title ILIKE $${pIdx} OR 
        u.full_name ILIKE $${pIdx} OR
        p.district ILIKE $${pIdx} OR
        ac.certificate_hash ILIKE $${pIdx}
      )`;
      params.push(`%${query}%`);
    }

    if (type) {
      sql += ` AND p.type = $${params.length + 1}`;
      params.push(type);
    }

    const countSql = `SELECT COUNT(*) FROM (${sql}) AS count_query`;
    const countRes = await db.query(countSql, params);
    const totalCount = parseInt(countRes.rows[0].count);

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);

    return res.json({
      assets: result.rows,
      total: totalCount,
      page: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (err) {
    console.error('[PUBLIC_SEARCH_ERROR]', err);
    return res.status(500).json({ error: "System unavailable" });
  }
});

module.exports = router;
