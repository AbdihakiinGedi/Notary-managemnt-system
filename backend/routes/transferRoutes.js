const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { logAudit } = require('../utils/auditLogger');
const { logEvent } = require('../utils/eventLedger');
const { generateCertificate } = require('../services/certificateService');
const { generateAgreementPDF } = require('../services/pdfService');
const notificationService = require('../services/notificationService');

const validateUUID = (req, res, next) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (req.params.id && !uuidRegex.test(req.params.id)) {
    return res.status(400).json({ error: 'Invalid UUID.' });
  }
  if (req.body?.property_id && !uuidRegex.test(req.body.property_id)) {
    return res.status(400).json({ error: 'Invalid property UUID.' });
  }
  if (req.body?.to_user && !uuidRegex.test(req.body.to_user)) {
    return res.status(400).json({ error: 'Invalid buyer UUID.' });
  }
  next();
};

// GET /api/transfers - Role-based visibility
router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    let q;
    let params = [];
    
    const cte = `WITH unified_assets AS (
      SELECT id, title, type::text, owner_id, status FROM properties
      UNION ALL
      SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
    )`;
    if (userRole === 'citizen') {
      q = `${cte} SELECT t.*, p.title as property_title, p.type as property_type, u1.full_name as seller_name, u2.full_name as buyer_name, u1.profile_photo as seller_photo, u2.profile_photo as buyer_photo, CASE WHEN t.status = 'completed' THEN u2.full_name ELSE u1.full_name END as owner_name, CASE WHEN t.status = 'completed' THEN u2.profile_photo ELSE u1.profile_photo END as owner_photo,
                  ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed, ta.locked
           FROM ownership_transfers t 
           JOIN unified_assets p ON t.property_id = p.id 
           JOIN users u1 ON t.from_user = u1.id 
           JOIN users u2 ON t.to_user = u2.id 
           LEFT JOIN users u_owner ON p.owner_id = u_owner.id
           LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
           WHERE t.from_user = $1 OR t.to_user = $1
           ORDER BY t.created_at DESC`;
      params = [req.user.id];
    } else if (userRole === 'notary') {
      q = `${cte} SELECT t.*, p.title as property_title, p.type as property_type, u1.full_name as seller_name, u2.full_name as buyer_name, u1.profile_photo as seller_photo, u2.profile_photo as buyer_photo, CASE WHEN t.status = 'completed' THEN u2.full_name ELSE u1.full_name END as owner_name, CASE WHEN t.status = 'completed' THEN u2.profile_photo ELSE u1.profile_photo END as owner_photo,
                  ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed, ta.locked
           FROM ownership_transfers t 
           JOIN unified_assets p ON t.property_id = p.id 
           JOIN users u1 ON t.from_user = u1.id 
           JOIN users u2 ON t.to_user = u2.id 
           LEFT JOIN users u_owner ON p.owner_id = u_owner.id
           LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
           WHERE t.status = 'accepted' AND t.notary_request_id = $1
           ORDER BY t.created_at DESC`;
      params = [req.user.id];
    } else if (userRole === 'officer') {
      q = `${cte} SELECT t.*, p.title as property_title, p.type as property_type, u1.full_name as seller_name, u2.full_name as buyer_name, u1.profile_photo as seller_photo, u2.profile_photo as buyer_photo, CASE WHEN t.status = 'completed' THEN u2.full_name ELSE u1.full_name END as owner_name, CASE WHEN t.status = 'completed' THEN u2.profile_photo ELSE u1.profile_photo END as owner_photo,
                  ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed, ta.locked
           FROM ownership_transfers t 
           JOIN unified_assets p ON t.property_id = p.id 
           JOIN users u1 ON t.from_user = u1.id 
           JOIN users u2 ON t.to_user = u2.id 
           LEFT JOIN users u_owner ON p.owner_id = u_owner.id
           LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
           WHERE t.status = 'pending_officer'
           ORDER BY t.created_at DESC`;
    } else {
      q = `${cte} SELECT t.*, p.title as property_title, p.type as property_type, u1.full_name as seller_name, u2.full_name as buyer_name, u1.profile_photo as seller_photo, u2.profile_photo as buyer_photo, CASE WHEN t.status = 'completed' THEN u2.full_name ELSE u1.full_name END as owner_name, CASE WHEN t.status = 'completed' THEN u2.profile_photo ELSE u1.profile_photo END as owner_photo,
                  ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed, ta.locked
           FROM ownership_transfers t 
           JOIN unified_assets p ON t.property_id = p.id 
           JOIN users u1 ON t.from_user = u1.id 
           JOIN users u2 ON t.to_user = u2.id
           LEFT JOIN users u_owner ON p.owner_id = u_owner.id
           LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
           ORDER BY t.created_at DESC`;
    }
    const result = await db.query(q, params);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// POST /api/transfers - Initiate transfer
router.post('/', authenticate, authorize('citizen'), validateUUID, async (req, res) => {
  const { property_id, to_user, price, notary_request_id } = req.body;
  
  try {
    const sellerPhotoCheck = await db.query('SELECT profile_photo FROM users WHERE id = $1', [req.user.id]);
    if (!sellerPhotoCheck.rows[0]?.profile_photo) {
      return res.status(400).json({ error: 'Profile photo is required before continuing.' });
    }

    const activeTransfer = await db.query(`
      SELECT id
      FROM ownership_transfers
      WHERE property_id = $1
      AND status IN ('initiated', 'accepted', 'pending_notary', 'pending_officer')
      LIMIT 1
    `, [property_id]);

    if (activeTransfer.rowCount > 0) {
      return res.status(400).json({
        error: 'This property already has an active transfer in progress.'
      });
    }

    const transferId = await db.withTransaction(async (tx) => {
      let pRes = await tx.query('SELECT owner_id, status FROM properties WHERE id = $1 FOR UPDATE', [property_id]);
      if (pRes.rowCount === 0) {
        pRes = await tx.query('SELECT current_owner_id as owner_id, status FROM assets WHERE id = $1 FOR UPDATE', [property_id]);
      }
      if (pRes.rowCount === 0) throw new Error("Asset not found");
      if (pRes.rows[0].owner_id !== req.user.id) throw new Error("Not authorized");
      if (pRes.rows[0].status === 'LOCKED') throw new Error("LOCKED_PROPERTY");
      if (pRes.rows[0].status !== 'registered' && pRes.rows[0].status !== 'ACTIVE' && pRes.rows[0].status !== 'active') throw new Error("Asset must be registered before transfer");
      
      const resArr = await tx.query(
        `INSERT INTO ownership_transfers (property_id, from_user, to_user, price, status, notary_request_id) 
         VALUES ($1, $2, $3, $4, 'initiated', $5) RETURNING id`,
        [property_id, req.user.id, to_user, price || 0, notary_request_id || null]
      );
      return resArr.rows[0].id;
    });

    await logAudit('TRANSFER_INITIATED', req.user.id, property_id, { transfer_id: transferId });
    await logEvent({
      event_type: 'TRANSFER_INITIATED',
      actor_id: req.user.id,
      asset_id: property_id,
      role: 'citizen',
      payload_json: { transfer_id: transferId, to_user }
    });

    // Notify Buyer and Admins
    db.query('SELECT email, full_name FROM users WHERE id = $1', [to_user])
      .then(async res => {
         if (res.rowCount > 0) {
           notificationService.sendTransferInitiated(req.user, res.rows[0], property_id).catch(console.error);
           const { notifyService } = require('../config/notificationHelper');
           await notifyService({
             event_type: 'TRANSFER_REQUEST_RECEIVED',
             actor_id: req.user.id,
             asset_id: property_id,
             payload_json: { to_user }
           });
           await notifyService({
             event_type: 'TRANSFER_INITIATED_ADMIN',
             actor_id: req.user.id,
             asset_id: property_id,
             payload_json: {}
           });
         }
      }).catch(console.error);

    return res.status(201).json({ id: transferId, status: 'initiated' });
  } catch (err) {
    if (err.message === 'LOCKED_PROPERTY') {
      return res.status(400).json({ error: "This property is locked and cannot be transferred." });
    }
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});
// GET /api/transfers/:id/details - Comprehensive details for Notary review
router.get('/:id/details', authenticate, validateUUID, async (req, res) => {
  try {
    const transferId = req.params.id;
    
    // Build a comprehensive deep JOIN to get factual database data
    const query = `
      SELECT 
        t.id as transfer_id, t.price, t.status, t.created_at as transfer_date,
        COALESCE(p.id, a.id) as property_id, COALESCE(p.title, (a.metadata->>'title')::text, 'Non-Land Asset') as property_title, COALESCE(p.district, 'N/A') as district, COALESCE(p.type::text, a.type::text) as property_type, p.metadata->>'area' as area, COALESCE(p.metadata->>'registration_number', a.metadata->>'registration_number') as registration_number,
        u_seller.full_name as seller_name, u_seller.national_id as seller_national_id, u_seller.profile_photo as seller_photo, u_seller.email as seller_email, u_seller.phone as seller_phone,
        u_buyer.full_name as buyer_name, u_buyer.national_id as buyer_national_id, u_buyer.profile_photo as buyer_photo, u_buyer.email as buyer_email, u_buyer.phone as buyer_phone,
        ta.id as agreement_id, ta.agreement_number, ta.seller_signed, ta.buyer_signed, ta.notary_signed, ta.officer_signed
      FROM ownership_transfers t
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN assets a ON t.property_id = a.id
      JOIN users u_seller ON t.from_user = u_seller.id
      JOIN users u_buyer ON t.to_user = u_buyer.id
      LEFT JOIN transfer_agreements ta ON ta.transfer_id = t.id
      WHERE t.id = $1
    `;
    
    const result = await db.query(query, [transferId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const details = result.rows[0];
    
    // Fetch related documents
    const docRes = await db.query(
      `SELECT id, file_path as document_url, file_name as document_type, created_at as uploaded_at 
       FROM documents 
       WHERE property_id = $1`,
      [details.property_id]
    );
    details.documents = docRes.rows;
    
    return res.json(details);
  } catch (err) {
    console.error('[TRANSFER DETAILS ERROR]', err);
    return res.status(500).json({ error: 'System unavailable' });
  }
});


// Citizen B accepts transfer
router.patch('/:id/accept', authenticate, authorize('citizen'), validateUUID, async (req, res) => {
  try {
    const transferId = req.params.id;
    const userId = req.user.id;

    // First do read-only validations outside transaction to return correct HTTP codes
    const checkRes = await db.query('SELECT to_user, status, from_user, property_id FROM ownership_transfers WHERE id = $1', [transferId]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = checkRes.rows[0];
    
    if (transfer.status !== 'initiated') {
      return res.status(409).json({ error: 'Transfer is not in initiated status' });
    }
    
    if (transfer.to_user !== userId) {
      return res.status(403).json({ error: 'Only the intended buyer can accept this transfer' });
    }

    // Explicit existence checks
    const buyerCheck = await db.query('SELECT id, profile_photo FROM users WHERE id = $1', [userId]);
    if (buyerCheck.rowCount === 0) return res.status(404).json({ error: 'Buyer does not exist' });
    if (!buyerCheck.rows[0]?.profile_photo) return res.status(400).json({ error: 'Profile photo is required before continuing.' });

    const sellerCheck = await db.query('SELECT id, profile_photo FROM users WHERE id = $1', [transfer.from_user]);
    if (sellerCheck.rowCount === 0) return res.status(404).json({ error: 'Seller does not exist' });
    if (!sellerCheck.rows[0]?.profile_photo) return res.status(400).json({ error: 'Profile photo is required before continuing.' });

    let propertyCheck = await db.query('SELECT id FROM properties WHERE id = $1', [transfer.property_id]);
    if (propertyCheck.rowCount === 0) {
      propertyCheck = await db.query('SELECT id FROM assets WHERE id = $1', [transfer.property_id]);
    }
    if (propertyCheck.rowCount === 0) return res.status(404).json({ error: 'Property does not exist' });

    // Now execute writes inside a single transaction
    const details = await db.withTransaction(async (tx) => {
      // 1. Update Transfer
      await tx.query(
        `UPDATE ownership_transfers SET status = 'accepted', updated_at = NOW() 
         WHERE id = $1`,
        [transferId]
      );

      // 2. Create transfer_agreement record
      const agrNum = `AGR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      await tx.query(
        `INSERT INTO transfer_agreements (transfer_id, agreement_number)
         SELECT $1, $2
         WHERE NOT EXISTS (SELECT 1 FROM transfer_agreements WHERE transfer_id = $1)`,
        [transferId, agrNum]
      );

      // 3. Generate Agreement PDF inside transaction context
      const { generateAgreementPDF } = require('../services/pdfService');
      try {
        await generateAgreementPDF(transferId, tx);
      } catch (pdfErr) {
        console.error('PDF_GENERATION_FAILED:', pdfErr);
      }

      // 4. Log Events
      const { logEvent } = require('../utils/eventLedger');
      try {
        await logEvent({
          event_type: 'TRANSFER_ACCEPTED',
          actor_id: userId,
          asset_id: transfer.property_id,
          role: 'citizen',
          payload_json: { transfer_id: transferId, from_user: transfer.from_user }
        }, tx);
      } catch (leErr) {
        console.error('EVENT_LOGGING_FAILED:', leErr);
      }

      try {
        await logEvent({
          event_type: 'AGREEMENT_CREATED',
          actor_id: userId,
          asset_id: transfer.property_id,
          role: 'system',
          payload_json: { transfer_id: transferId }
        }, tx);
      } catch (leErr2) {
        console.error('EVENT_LOGGING_FAILED_2:', leErr2);
      }

      return transfer;
    });

    // Notify Seller (fire and forget outside transaction)
    db.query('SELECT email FROM users WHERE id = $1', [details.from_user])
      .then(async emailRes => {
         if (emailRes.rowCount > 0) {
           notificationService.sendTransferAccepted(emailRes.rows[0].email, req.user.full_name || req.user.name, details.property_id).catch(console.error);
           const { notifyService } = require('../config/notificationHelper');
           try {
             await notifyService({
               event_type: 'BUYER_ACCEPTED_TRANSFER',
               actor_id: userId,
               asset_id: details.property_id,
               payload_json: { transfer_id: transferId }
             });
           } catch (notifErr1) {
             console.error('NOTIFICATION_FAILED_1:', notifErr1);
           }
           
           try {
             await notifyService({
               event_type: 'DOCUMENTS_READY_REVIEW',
               actor_id: userId,
               asset_id: details.property_id,
               payload_json: { transfer_id: transferId }
             });
           } catch (notifErr2) {
             console.error('NOTIFICATION_FAILED_2:', notifErr2);
           }
         }
      }).catch(console.error);

    return res.json({ status: 'accepted' });
  } catch (err) {
    console.error('ACCEPT_TRANSFER_ERROR:', err.stack || err.message);
    if (err.query) console.error('FAILING_QUERY:', err.query);
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

// Notary certifies transfer
router.patch('/:id/notary-certify', authenticate, authorize('notary'), validateUUID, async (req, res) => {
  try {
    const result = await db.withTransaction(async (tx) => {
      const tRes = await tx.query(`
        WITH unified_assets AS (
          SELECT id, title, type::text, owner_id, status FROM properties
          UNION ALL
          SELECT id, COALESCE(metadata->>'title', 'Asset')::text as title, type::text, current_owner_id as owner_id, status FROM assets WHERE id NOT IN (SELECT id FROM properties)
        )
        SELECT t.*, p.type as property_type 
        FROM ownership_transfers t 
        JOIN unified_assets p ON t.property_id = p.id 
        WHERE t.id = $1 AND t.status = 'accepted' FOR UPDATE`, [req.params.id]);
      
      if (tRes.rowCount === 0) throw new Error("Transfer not found");
      const t = tRes.rows[0];

      // Validate and save notary signature
      const agrRes = await tx.query('SELECT * FROM transfer_agreements WHERE transfer_id = $1 FOR UPDATE', [req.params.id]);
      if (agrRes.rowCount === 0) throw new Error("Agreement document not found. Complete citizens signatures first.");
      const agr = agrRes.rows[0];

      if (!agr.locked || !agr.seller_signed || !agr.buyer_signed) {
        const err = new Error("Seller and buyer signatures are required before notary certification.");
        err.statusCode = 409;
        throw err;
      }

      if (agr.notary_signed) {
        const err = new Error("Notary has already signed this agreement.");
        err.statusCode = 409;
        throw err;
      }

      const { signature_image } = req.body;
      if (!signature_image) {
        const err = new Error("Notary digital signature drawing is required.");
        err.statusCode = 400;
        throw err;
      }

      const metadataStr = `${agr.id}-${req.user.id}-notary-${Date.now()}`;
      const sigHash = crypto.createHash('sha256').update(signature_image + metadataStr).digest('hex');
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      await tx.query(`
        INSERT INTO digital_signatures (agreement_id, user_id, role, signature_type, signature_image, signature_hash, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [agr.id, req.user.id, 'notary', 'notary_signature', signature_image, sigHash, ipAddress]);

      await tx.query('UPDATE transfer_agreements SET notary_signed = true, updated_at = NOW() WHERE id = $1', [agr.id]);

      const isLand = t.property_type && ['land', 'residential', 'commercial', 'industrial'].includes(t.property_type.toLowerCase());
      if (isLand) {
        await tx.query(`UPDATE ownership_transfers SET status = 'pending_officer', updated_at = NOW() WHERE id = $1`, [req.params.id]);
        return { status: 'pending_officer', transfer: t, sigHash, ipAddress };
      } else {
        // ATOMIC SWAP for Non-Land
        await tx.query('UPDATE asset_ownerships SET active = false, end_date = NOW() WHERE asset_id = $1 AND owner_id = $2 AND active = true', [t.property_id, t.from_user]);
        await tx.query('INSERT INTO asset_ownerships (asset_id, owner_id, start_date, active) VALUES ($1, $2, NOW(), true)', [t.property_id, t.to_user]);
        await tx.query('UPDATE properties SET owner_id = $1 WHERE id = $2', [t.to_user, t.property_id]);
        await tx.query('UPDATE assets SET current_owner_id = $1 WHERE id = $2', [t.to_user, t.property_id]);
        await tx.query(`UPDATE ownership_transfers SET status = 'completed', updated_at = NOW() WHERE id = $1`, [req.params.id]);
        
        // GENERATE CERTIFICATE
        await generateCertificate(t.property_id, t.to_user, req.user.id, req.params.id, tx);

        return { status: 'completed', transfer: t, sigHash, ipAddress };
      }
    });

    // Regenerate/Update PDF to embed Notary signature
    await generateAgreementPDF(req.params.id);

    await logAudit('NOTARY_SIGNED', req.user.id, null, { transfer_id: req.params.id, signature_hash: result.sigHash, ip: result.ipAddress });
    await logAudit('TRANSFER_NOTARIZED', req.user.id, null, { transfer_id: req.params.id, final_status: result.status });
    
    await logEvent({
      event_type: 'TRANSFER_NOTARIZED',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      role: 'notary',
      payload_json: { 
        transfer_id: req.params.id, 
        from_user: result.transfer.from_user, 
        to_user: result.transfer.to_user, 
        final_status: result.status 
      }
    });

    const { notifyService } = require('../config/notificationHelper');
    if (result.status === 'pending_officer') {
      await notifyService({
        event_type: 'LAND_TRANSFER_WAITING_APPROVAL',
        actor_id: req.user.id,
        asset_id: result.transfer.property_id,
        payload_json: { transfer_id: req.params.id }
      });
    } else if (result.status === 'completed') {
      await notifyService({
        event_type: 'TRANSFER_COMPLETED_CITIZEN',
        actor_id: req.user.id,
        asset_id: result.transfer.property_id,
        payload_json: { to_user: result.transfer.to_user, from_user: result.transfer.from_user }
      });
      await notifyService({
        event_type: 'TRANSFER_COMPLETED_NOTARY',
        actor_id: req.user.id,
        asset_id: result.transfer.property_id,
        payload_json: {}
      });
      await notifyService({
        event_type: 'TRANSFER_COMPLETED_ADMIN',
        actor_id: req.user.id,
        asset_id: result.transfer.property_id,
        payload_json: {}
      });
    }

    return res.json({ status: result.status });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

// Officer approves Land transfer
router.patch('/:id/officer-approve', authenticate, authorize('officer'), validateUUID, async (req, res) => {
  try {
    const result = await db.withTransaction(async (tx) => {
      const tRes = await tx.query(`
        SELECT t.*, p.type as property_type 
        FROM ownership_transfers t 
        JOIN properties p ON t.property_id = p.id 
        WHERE t.id = $1 AND t.status = 'pending_officer' FOR UPDATE`, [req.params.id]);
      
      if (tRes.rowCount === 0) throw new Error("Transfer not found");
      const t = tRes.rows[0];

      // Validate and save officer signature
      const agrRes = await tx.query('SELECT * FROM transfer_agreements WHERE transfer_id = $1 FOR UPDATE', [req.params.id]);
      if (agrRes.rowCount === 0) throw new Error("Agreement document not found.");
      const agr = agrRes.rows[0];

      if (!agr.notary_signed) {
        throw new Error("The agreement must be verified and signed by a Notary before Officer approval.");
      }

      if (agr.officer_signed) throw new Error("Officer has already signed this agreement.");

      const { signature_image } = req.body;
      if (!signature_image) throw new Error("Officer digital signature drawing is required.");

      const metadataStr = `${agr.id}-${req.user.id}-officer-${Date.now()}`;
      const sigHash = crypto.createHash('sha256').update(signature_image + metadataStr).digest('hex');
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      await tx.query(`
        INSERT INTO digital_signatures (agreement_id, user_id, role, signature_type, signature_image, signature_hash, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [agr.id, req.user.id, 'officer', 'officer_signature', signature_image, sigHash, ipAddress]);

      await tx.query('UPDATE transfer_agreements SET officer_signed = true, updated_at = NOW() WHERE id = $1', [agr.id]);

      // ATOMIC SWAP
      await tx.query('UPDATE asset_ownerships SET active = false, end_date = NOW() WHERE asset_id = $1 AND owner_id = $2 AND active = true', [t.property_id, t.from_user]);
      await tx.query('INSERT INTO asset_ownerships (asset_id, owner_id, start_date, active) VALUES ($1, $2, NOW(), true)', [t.property_id, t.to_user]);
      await tx.query('UPDATE properties SET owner_id = $1 WHERE id = $2', [t.to_user, t.property_id]);
      await tx.query('UPDATE assets SET current_owner_id = $1 WHERE id = $2', [t.to_user, t.property_id]);
      await tx.query(`UPDATE ownership_transfers SET status = 'completed', updated_at = NOW() WHERE id = $1`, [req.params.id]);

      // GENERATE CERTIFICATE
      await generateCertificate(t.property_id, t.to_user, req.user.id, req.params.id, tx);
      return { transfer: t, sigHash, ipAddress };
    });

    // Regenerate/Update PDF to embed Officer signature
    await generateAgreementPDF(req.params.id);

    await logAudit('OFFICER_SIGNED', req.user.id, null, { transfer_id: req.params.id, signature_hash: result.sigHash, ip: result.ipAddress });
    await logAudit('TRANSFER_OFFICER_APPROVED', req.user.id, null, { transfer_id: req.params.id });

    await logEvent({
      event_type: 'TRANSFER_OFFICER_APPROVED',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      role: 'officer',
      payload_json: { 
        transfer_id: req.params.id, 
        from_user: result.transfer.from_user, 
        to_user: result.transfer.to_user 
      }
    });
    const { notifyService } = require('../config/notificationHelper');
    await notifyService({
      event_type: 'TRANSFER_COMPLETED_CITIZEN',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      payload_json: { to_user: result.transfer.to_user, from_user: result.transfer.from_user }
    });
    await notifyService({
      event_type: 'TRANSFER_COMPLETED_NOTARY',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      payload_json: {}
    });
    await notifyService({
      event_type: 'TRANSFER_COMPLETED_ADMIN',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      payload_json: {}
    });
    await notifyService({
      event_type: 'TRANSFER_COMPLETED_OFFICER',
      actor_id: req.user.id,
      asset_id: result.transfer.property_id,
      payload_json: {}
    });

    return res.json({ status: 'completed' });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

// Reject transfer
router.patch('/:id/reject', authenticate, authorize('citizen', 'notary', 'officer'), validateUUID, async (req, res) => {
  try {
    const transferId = req.params.id;
    const userId = req.user.id;

    // First do read-only validations outside transaction to return correct HTTP codes
    const checkRes = await db.query('SELECT to_user, status, from_user, property_id FROM ownership_transfers WHERE id = $1', [transferId]);
    if (checkRes.rowCount === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    
    const transfer = checkRes.rows[0];
    
    if (transfer.status !== 'initiated') {
      return res.status(409).json({ error: 'Transfer is not in initiated status' });
    }
    
    // If it's a citizen attempting to reject, they MUST be the intended buyer
    if (req.user.role === 'citizen') {
      if (transfer.to_user !== userId) {
        return res.status(403).json({ error: 'Only the intended buyer can reject this transfer' });
      }
      
      const agrRes = await db.query('SELECT locked FROM transfer_agreements WHERE transfer_id = $1', [transferId]);
      if (agrRes.rowCount > 0 && agrRes.rows[0].locked) {
        const { logAudit } = require('../utils/logger'); // Ensure logAudit exists or use eventLedger
        // Log attempt (fire and forget)
        try {
          const { logEvent } = require('../utils/eventLedger');
          await logEvent({
            event_type: 'REJECT_ATTEMPT_ON_LOCKED_AGREEMENT',
            actor_id: userId,
            asset_id: transfer.property_id,
            role: req.user.role,
            payload_json: { transfer_id: transferId }
          });
        } catch (e) {
          console.error('EVENT_LOGGING_FAILED:', e);
        }
        return res.status(400).json({ error: 'This transfer agreement is legally signed and locked. It cannot be rejected or modified by the citizens.' });
      }
    }

    // Execute write inside a transaction
    await db.withTransaction(async (tx) => {
      await tx.query(`UPDATE ownership_transfers SET status = 'rejected', updated_at = NOW() WHERE id = $1`, [transferId]);
      
      // Log Event
      const { logEvent } = require('../utils/eventLedger');
      try {
        await logEvent({
          event_type: 'TRANSFER_REJECTED',
          actor_id: userId,
          asset_id: transfer.property_id,
          role: req.user.role,
          payload_json: { transfer_id: transferId, owner_id: transfer.from_user }
        }, tx);
      } catch (leErr) {
        console.error('EVENT_LOGGING_FAILED:', leErr);
      }
    });

    // Notifications (fire and forget outside transaction)
    db.query('SELECT email FROM users WHERE id = $1', [transfer.from_user])
      .then(async uRes => {
         if (uRes.rowCount > 0) {
           notificationService.sendTransferRejected(uRes.rows[0].email, req.user.full_name || req.user.name || 'System Authority', transfer.property_id).catch(console.error);
           const { notifyService } = require('../config/notificationHelper');
           try {
             await notifyService({
               event_type: 'TRANSFER_REJECTED',
               actor_id: userId,
               asset_id: transfer.property_id,
               payload_json: { owner_id: transfer.from_user }
             });
           } catch (notifErr) {
             console.error('NOTIFICATION_FAILED:', notifErr);
           }
         }
      }).catch(console.error);

    return res.json({ status: 'rejected' });
  } catch (err) {
    console.error('REJECT_TRANSFER_ERROR:', err.stack || err.message);
    if (err.query) console.error('FAILING_QUERY:', err.query);
    return res.status(500).json({ error: err.message || 'System unavailable' });
  }
});

module.exports = router;


