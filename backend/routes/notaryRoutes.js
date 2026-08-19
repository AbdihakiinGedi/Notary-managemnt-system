const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { safeExecute } = require('../middleware/systemMiddleware');
const { notifyService } = require('../config/notificationHelper');
const crypto = require('crypto');

const { logAudit } = require('../utils/auditLogger');

// GET /notary/certificates - Fetch user's certificates
router.get('/certificates', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT c.*, r.type as request_type 
      FROM notary_certificates c 
      JOIN notary_requests r ON c.request_id = r.id 
      JOIN notary_participants p ON p.request_id = r.id
      WHERE p.user_id = $1
      ORDER BY c.issued_at DESC
    `;
    const result = await db.query(query, [req.user.id]);
    
    // De-duplicate if multiple participants are the same user
    const uniqueCerts = [];
    const seen = new Set();
    for (const row of result.rows) {
        if (!seen.has(row.id)) {
            seen.add(row.id);
            uniqueCerts.push(row);
        }
    }
    
    return res.json(uniqueCerts);
  } catch (err) {
    return res.status(500).json({ error: "System unavailable" });
  }
});

// GET /notary/certificate/:id - Fetch with Integrity Check (#5)
router.get('/certificate/:id', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, r.type as request_type 
       FROM notary_certificates c 
       JOIN notary_requests r ON c.request_id = r.id 
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Certificate not found" });
    const cert = result.rows[0];

    // 5. Certificate Tamper Detection (Read Path) (#5)
    const computedHash = crypto.createHash('sha256').update(JSON.stringify(cert.certificate_json)).digest('hex');
    if (computedHash !== cert.certificate_hash) {
      console.error(`[CRITICAL_TAMPER_DETECTED] Cert ID: ${cert.id}, Expected: ${cert.certificate_hash}, Computed: ${computedHash}`);
      return res.status(500).json({ error: "System unavailable" });
    }

    return res.json(cert);
  } catch (err) {
    return res.status(500).json({ error: "System unavailable" });
  }
});

// POST /notary/request - Create a notarization request
router.post('/request', authenticate, async (req, res) => {
  const { type, participants, documents, assigned_notary_id } = req.body;
  if (!type || !participants || !Array.isArray(participants) || !assigned_notary_id) {
    return res.status(400).json({ error: "Operation failed" });
  }

  try {
    const requestId = await db.withTransaction(async (tx) => {
      // Create core request with assigned notary
      const reqRes = await tx.query(
        'INSERT INTO notary_requests (type, assigned_notary_id) VALUES ($1, $2) RETURNING id',
        [type, assigned_notary_id]
      );
      const rid = reqRes.rows[0].id;

      // Add participants
      for (const userId of participants) {
        await tx.query(
          'INSERT INTO notary_participants (request_id, user_id) VALUES ($1, $2)',
          [rid, userId]
        );
      }

      // Add documents with hash match protection and reuse logic (#4)
      if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
          const existingDoc = await tx.query('SELECT id FROM notary_documents WHERE file_hash = $1 FOR SHARE', [doc.file_hash]);
          
          if (existingDoc.rowCount > 0) {
            const linked = await tx.query('SELECT id FROM notary_documents WHERE file_hash = $1 AND request_id = $2', [doc.file_hash, rid]);
            if (linked.rowCount === 0) {
                await tx.query(
                    'INSERT INTO notary_documents (request_id, file_path, file_name, file_hash) VALUES ($1, $2, $3, $4)',
                    [rid, doc.file_path, doc.file_name, doc.file_hash]
                );
            }
          } else {
            await tx.query(
                'INSERT INTO notary_documents (request_id, file_path, file_name, file_hash) VALUES ($1, $2, $3, $4)',
                [rid, doc.file_path, doc.file_name, doc.file_hash]
            );
          }
        }
      }

      return rid;
    });

    safeExecute(async () => {
      await logAudit('NOTARY_REQUEST', req.user.id, null, { request_id: requestId });
      for (const userId of participants) {
        await notifyService({ event_type: 'NOTARY_REQUEST_CREATE', actor_id: userId, asset_id: requestId, payload_json: { type } });
      }
      await notifyService({
        event_type: 'TRANSFER_ASSIGNED',
        actor_id: req.user.id,
        asset_id: requestId,
        payload_json: { assigned_notary_id: assigned_notary_id }
      });
    }, 'NOTARY_REQUEST_CREATE')(req);

    return res.json({ success: true, id: requestId });
  } catch (err) {
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// PATCH /notary/:id/sign - Participant signs a document
router.patch('/:id/sign', authenticate, async (req, res) => {
  try {
    await db.withTransaction(async (tx) => {
      const docRes = await tx.query('SELECT file_hash FROM notary_documents WHERE request_id = $1', [req.params.id]);
      if (docRes.rowCount === 0) throw new Error("Operation failed");
      const compositeDocHash = crypto.createHash('sha256').update(docRes.rows.map(r => r.file_hash).join('')).digest('hex');

      // Use DB time for legal signature (#7)
      const timeRes = await tx.query('SELECT NOW() as db_now');
      const signedAt = timeRes.rows[0].db_now;
      
      const signatureHash = crypto.createHash('sha256').update(compositeDocHash + req.user.id + signedAt).digest('hex');

      const resArr = await tx.query(
        `UPDATE notary_participants 
         SET status = 'signed', signed_at = $1, signature_hash = $2
         WHERE request_id = $3 AND user_id = $4 AND status = 'pending'`,
        [signedAt, signatureHash, req.params.id, req.user.id]
      );
      
      if (resArr.rowCount === 0) throw new Error("Conflict detected");

      const signCheck = await tx.query('SELECT COUNT(*) FROM notary_participants WHERE request_id = $1 AND status = \'signed\'', [req.params.id]);
      if (parseInt(signCheck.rows[0].count) === 1) { 
        await tx.query('UPDATE notary_documents SET locked = true WHERE request_id = $1', [req.params.id]);
      }
    });

    safeExecute(async () => {
      await logAudit('NOTARY_SIGN', req.user.id, null, { request_id: req.params.id });
    }, 'PARTICIPANT_SIGN')(req);

    return res.json({ success: true });
  } catch (err) {
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// PATCH /notary/:id/notarize - Finalize notarization (Only assigned Notary)
router.patch('/:id/notarize', authenticate, authorize('notary'), async (req, res) => {
  try {
    // 2. Distributed Clock Consistency (#2) + Heavy work outside (#3)
    const dbTime = await db.query('SELECT NOW() as db_now');
    const issuedAt = dbTime.rows[0].db_now;

    const docs = await db.query('SELECT file_hash FROM notary_documents WHERE request_id = $1', [req.params.id]);
    const participants = await db.query('SELECT user_id, signature_hash FROM notary_participants WHERE request_id = $1', [req.params.id]);

    // Canonicalize for strict hashing (#4)
    const certData = {
      request_id: req.params.id,
      document_hashes: docs.rows.map(d => d.file_hash).sort(),
      participants: participants.rows.map(p => p.user_id).sort(),
      signature_hashes: participants.rows.map(p => p.signature_hash).sort(),
      issued_at: issuedAt,
      notary_id: req.user.id,
      schema_version: 1
    };
    const certHash = crypto.createHash('sha256').update(JSON.stringify(certData)).digest('hex');

    await db.withTransaction(async (tx) => {
      // 10. Immutability Check (#10) - Ensure no prior notarization + Auth Check
      const requestRes = await tx.query(
        'SELECT status, assigned_notary_id FROM notary_requests WHERE id = $1 FOR UPDATE', 
        [req.params.id]
      );
      if (requestRes.rowCount === 0) throw new Error("Operation failed");
      if (requestRes.rows[0].assigned_notary_id !== req.user.id) throw new Error("Access denied");
      if (requestRes.rows[0].status === 'notarized') throw new Error("Conflict detected: Already notarized");

      await tx.query(
        "UPDATE notary_requests SET status = 'notarized', updated_at = $1 WHERE id = $2 AND status = 'pending'",
        [issuedAt, req.params.id]
      );

      await tx.query(
        'INSERT INTO notary_certificates (request_id, notary_id, certificate_hash, certificate_json, issued_at) VALUES ($1, $2, $3, $4, $5)',
        [req.params.id, req.user.id, certHash, JSON.stringify(certData), issuedAt]
      );

      // 1. Cross-Service Atomicity (#1) - Audit + Ledger inside transaction
      await logAudit('NOTARIZE_FINAL', req.user.id, null, { request_id: req.params.id, idempotencyHash: req.idempotencyHash }, tx);
    });

    safeExecute(async () => {
      const pRes = await db.query('SELECT user_id FROM notary_participants WHERE request_id = $1', [req.params.id]);
      for (const p of pRes.rows) {
        await notifyService({ event_type: 'NOTARIZATION_COMPLETE', actor_id: p.user_id, asset_id: req.params.id });
      }
    }, 'NOTARIZATION_FINALIZE')(req);

    return res.json({ success: true });
  } catch (err) {
    if (err.message === 'Access denied') return res.status(403).json({ error: 'Access denied' });
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
