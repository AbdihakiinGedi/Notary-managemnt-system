const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { generateAgreementPDF } = require('../services/pdfService');
const { logAudit } = require('../utils/auditLogger');
const { logEvent } = require('../utils/eventLedger');

// 1. Get agreement details by transfer ID
router.get('/:transferId', authenticate, async (req, res) => {
  try {
    const agrRes = await db.query(`
      WITH unified_assets AS (
        SELECT id, title, type::text, owner_id, status FROM properties
        UNION ALL
        SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
      )
      SELECT ta.*, t.from_user, t.to_user, t.notary_request_id, p.type as property_type
      FROM transfer_agreements ta
      JOIN ownership_transfers t ON ta.transfer_id = t.id
      JOIN unified_assets p ON t.property_id = p.id
      WHERE ta.transfer_id = $1
    `, [req.params.transferId]);

    if (agrRes.rowCount === 0) {
      return res.status(404).json({ error: 'Agreement not found.' });
    }

    const agr = agrRes.rows[0];

    // Fetch signatures
    const sigsRes = await db.query(`
      SELECT ds.id, ds.user_id, ds.role, ds.signature_type, ds.signature_hash, ds.signed_at, u.full_name
      FROM digital_signatures ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.agreement_id = $1
    `, [agr.id]);

    return res.json({
      agreement: agr,
      signatures: sigsRes.rows
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

// 2. Download / Stream PDF agreement
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const agrRes = await db.query('SELECT pdf_path, agreement_number FROM transfer_agreements WHERE id = $1', [req.params.id]);
    if (agrRes.rowCount === 0) {
      return res.status(404).json({ error: 'Agreement PDF not found.' });
    }

    const pdfPath = agrRes.rows[0].pdf_path;
    if (!pdfPath) {
      return res.status(404).json({ error: 'Agreement PDF file has not been generated yet.' });
    }

    const fullPath = path.join(__dirname, '..', pdfPath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Agreement PDF file does not exist on disk.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=agreement-${agrRes.rows[0].agreement_number}.pdf`);
    return fs.createReadStream(fullPath).pipe(res);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

// 3. Citizen or Notary signs the agreement
router.post('/:id/sign', authenticate, authorize('citizen', 'notary'), async (req, res) => {
  const { signature_image } = req.body;
  if (!signature_image) {
    return res.status(400).json({ error: 'Signature drawing is required.' });
  }

  try {
    const result = await db.withTransaction(async (tx) => {
      // Fetch agreement details
      const agrRes = await tx.query(`
        WITH unified_assets AS (
          SELECT id, title, type::text, owner_id, status FROM properties
          UNION ALL
          SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
        )
        SELECT ta.*, t.from_user, t.to_user, t.notary_request_id, p.id as asset_id
        FROM transfer_agreements ta
        JOIN ownership_transfers t ON ta.transfer_id = t.id
        JOIN unified_assets p ON t.property_id = p.id
        WHERE ta.id = $1 FOR UPDATE
      `, [req.params.id]);

      if (agrRes.rowCount === 0) throw new Error('Agreement not found');
      const agr = agrRes.rows[0];

      if (agr.locked) {
        throw new Error('This agreement is locked and cannot be signed or modified.');
      }

      // Determine user role
      let role = null;
      let signatureType = null;
      
      if (req.user.id === agr.from_user) {
        role = 'seller';
        signatureType = 'seller_signature';
        if (agr.seller_signed) throw new Error('Seller has already signed this agreement');
      } else if (req.user.id === agr.to_user) {
        role = 'buyer';
        signatureType = 'buyer_signature';
        if (agr.buyer_signed) throw new Error('Buyer has already signed this agreement');
      } else if (req.user.role === 'notary' && req.user.id === agr.notary_request_id) {
        role = 'notary';
        signatureType = 'notary_signature';
        if (agr.notary_signed) throw new Error('Notary has already signed this agreement');
      } else {
        throw new Error('Not authorized to sign this agreement.');
      }

      // Compute SHA256 of signature image and metadata for audit integrity
      const metadataStr = `${req.params.id}-${req.user.id}-${role}-${Date.now()}`;
      const sigHash = crypto.createHash('sha256').update(signature_image + metadataStr).digest('hex');
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      // Insert signature record
      await tx.query(`
        INSERT INTO digital_signatures (agreement_id, user_id, role, signature_type, signature_image, signature_hash, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.params.id, req.user.id, role, signatureType, signature_image, sigHash, ipAddress]);

      // Update agreement sign state
      let updateCol = role === 'seller' ? 'seller_signed' : (role === 'buyer' ? 'buyer_signed' : 'notary_signed');
      await tx.query(`UPDATE transfer_agreements SET ${updateCol} = true, updated_at = NOW() WHERE id = $1`, [req.params.id]);

      // Check if both seller and buyer have signed to lock the agreement
      const checkRes = await tx.query(`SELECT seller_signed, buyer_signed FROM transfer_agreements WHERE id = $1`, [req.params.id]);
      const current = checkRes.rows[0];
      let locked = false;

      if (current.seller_signed && current.buyer_signed) {
        locked = true;
        await tx.query('UPDATE transfer_agreements SET locked = true, updated_at = NOW() WHERE id = $1', [req.params.id]);
      }

      return { role, signatureType, sigHash, ipAddress, locked, assetId: agr.asset_id, transferId: agr.transfer_id };
    });

    // Logging & Auditing
    const actionType = result.role === 'seller' ? 'SELLER_SIGNED' : 'BUYER_SIGNED';
    await logAudit(actionType, req.user.id, null, { agreement_id: req.params.id, signature_hash: result.sigHash, ip: result.ipAddress });
    await logEvent({
      event_type: actionType,
      actor_id: req.user.id,
      asset_id: result.assetId,
      role: 'citizen',
      payload_json: { agreement_id: req.params.id, hash: result.sigHash, locked: result.locked }
    });

    if (result.locked) {
      await logAudit('AGREEMENT_LOCKED', req.user.id, null, { agreement_id: req.params.id });
      await logEvent({
        event_type: 'AGREEMENT_LOCKED',
        actor_id: req.user.id,
        asset_id: result.assetId,
        role: 'system',
        payload_json: { agreement_id: req.params.id }
      });
      
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'WAITING_NOTARY_SIGNATURE',
        actor_id: req.user.id,
        asset_id: result.assetId,
        payload_json: { transfer_id: result.transferId }
      });
    }

    // Regenerate/Update the PDF to include the signature
    await generateAgreementPDF(result.transferId);

    return res.json({
      status: 'signed',
      role: result.role,
      locked: result.locked
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

module.exports = router;
