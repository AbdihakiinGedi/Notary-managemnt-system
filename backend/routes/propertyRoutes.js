const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../config/db');
const path = require('path');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const fs = require('fs');
const { sendNotification } = require('../config/notificationHelper');
const { safeExecute } = require('../middleware/systemMiddleware');
const notificationService = require('../services/notificationService');

const { logAudit } = require('../utils/auditLogger');
const { logEvent } = require('../utils/eventLedger');
const { generateCertificate } = require('../services/certificateService');
const { generatePropertyReportPDF } = require('../services/reportService');


// Get All Properties (Role-Based Visibility)
router.get('/', authenticate, async (req, res) => {
  console.log('PROPERTY_HIT >> GET /', req.user?.role);
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Access denied' });

    const userRole = (req.user.role || '').toLowerCase();
    let result;

    if (userRole === 'admin') {
      result = await db.query(`
        SELECT p.*, u.full_name as owner_name 
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.status != 'deleted' 
        ORDER BY p.created_at DESC
      `);
    } else if (userRole === 'citizen') {
      result = await db.query(`
        SELECT p.*, u.full_name as owner_name 
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.owner_id = $1 AND p.status != 'deleted' 
        ORDER BY p.created_at DESC
      `, [req.user.id]);
    } else if (userRole === 'notary') {
      result = await db.query(`
        SELECT p.*, u.full_name as owner_name 
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.status = 'pending_notary' 
        ORDER BY p.created_at DESC
      `);
    } else {
      result = await db.query(`
        SELECT p.*, u.full_name as owner_name 
        FROM properties p 
        LEFT JOIN users u ON p.owner_id = u.id 
        WHERE p.status != 'deleted' 
        ORDER BY p.created_at DESC
      `);
    }
    
    return res.json(result.rows || []);
  } catch (err) {
    console.error('[PROPERTIES_ROUTE_ERROR]', err);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Get My Properties (Citizen)
router.get('/my-properties', authenticate, async (req, res) => {
  try {
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Access denied' });
    
    const result = await db.query(`
      SELECT p.*, u.full_name as owner_name 
      FROM properties p 
      LEFT JOIN users u ON p.owner_id = u.id 
      WHERE p.owner_id = $1 AND p.status != 'deleted' 
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    
    return res.json(result.rows || []);
  } catch (err) {
    console.error('[PROPERTIES_MY_ERROR]', err);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Add Property (Citizen only)
const enforceCitizenOnly = (req, res, next) => {
  if (req.user && req.user.role === 'citizen') {
    return next();
  }
  return res.status(403).json({ error: 'Only Citizens can register new properties.' });
};

router.post('/', authenticate, enforceCitizenOnly, upload.fields([{ name: 'documents', maxCount: 10 }, { name: 'image', maxCount: 10 }]), async (req, res) => {
  let { title, description, district, address, type, latitude, longitude, metadata, visibility } = req.body;
  if (!title || !district || !address || !type) return res.status(400).json({ error: 'Missing required fields' });

  const isLand = ['land', 'residential', 'commercial', 'industrial'].includes(type.toLowerCase());
  if (isLand && (!latitude || !longitude)) {
    return res.status(400).json({ error: 'Latitude and longitude are required for land properties' });
  }

  const lat = (latitude === '' || latitude === undefined) ? null : latitude;
  const lng = (longitude === '' || longitude === undefined) ? null : longitude;

  try {
    const newProperty = await db.withTransaction(async (tx) => {
      const pRes = await tx.query(`
        INSERT INTO properties (title, description, district, address, type, latitude, longitude, owner_id, metadata, visibility, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending_notary')
        RETURNING id
      `, [title, description, district, address, type, lat, lng, req.user.id, metadata || '{}', visibility || 'private']);
      
      const pId = pRes.rows[0].id;

      const fs = require('fs');
      const path = require('path');
      
      const propertiesDir = path.join(__dirname, '..', 'uploads', 'properties');
      const documentsDir = path.join(__dirname, '..', 'uploads', 'documents');
      
      if (!fs.existsSync(propertiesDir)) fs.mkdirSync(propertiesDir, { recursive: true });
      if (!fs.existsSync(documentsDir)) fs.mkdirSync(documentsDir, { recursive: true });

      if (req.files && req.files.image && req.files.image[0]) {
        const file = req.files.image[0];
        const destPath = path.join(propertiesDir, file.filename);
        fs.copyFileSync(file.path, destPath);
        
        const webPath = '/uploads/properties/' + file.filename;
        await tx.query('UPDATE properties SET image_url = $1 WHERE id = $2', [webPath, pId]);
      }

      if (req.files && req.files.documents) {
        for (const file of req.files.documents) {
          const destPath = path.join(documentsDir, file.filename);
          fs.copyFileSync(file.path, destPath);
          
          const fileBuffer = fs.readFileSync(destPath);
          const fileHash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
          const webPath = '/uploads/documents/' + file.filename;
          
          await tx.query(
            'INSERT INTO documents (property_id, uploaded_by, file_name, file_path, file_hash) VALUES ($1, $2, $3, $4, $5)',
            [pId, req.user.id, file.originalname, webPath, fileHash]
          );
        }
      }

      await logEvent({ event_type: 'PROPERTY_REGISTERED', actor_id: req.user.id, asset_id: pId, role: 'citizen', payload_json: { title } }, tx);
      return pRes.rows[0];
    });

    const { notifyService } = require('../config/notificationHelper');
    await notifyService({
      event_type: 'PROPERTY_REGISTRATION_SUBMITTED',
      actor_id: req.user.id,
      asset_id: newProperty.id,
      payload_json: { title }
    });
    await notifyService({
      event_type: 'NEW_PROPERTY_REGISTERED',
      actor_id: req.user.id,
      asset_id: newProperty.id,
      payload_json: { title }
    });
    // Triggers New Property Waiting Verification for Officers
    await notifyService({
      event_type: 'NEW_PROPERTY_WAITING_VERIFICATION',
      actor_id: req.user.id,
      asset_id: newProperty.id,
      payload_json: { title }
    });
    // Triggers New Property Waiting Verification for Notaries
    await notifyService({
      event_type: 'PROPERTY_WAITING_VERIFICATION',
      actor_id: req.user.id,
      asset_id: newProperty.id,
      payload_json: { title }
    });

    return res.status(201).json({ message: 'Property registered successfully', property: newProperty });
  } catch (err) {
    console.error('[PROPERTY_ADD_ERROR]', err);
    if (err.message && (err.message.includes('invalid input') || err.message.includes('violates') || err.message.includes('too long'))) {
      return res.status(400).json({ error: 'Validation failed. Please check your inputs and try again.', details: err.message });
    }
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Get Property Documents
router.get('/:id/documents', authenticate, async (req, res) => {
  try {
    const docs = await db.query('SELECT id, file_name, created_at FROM documents WHERE property_id = $1', [req.params.id]);
    return res.json(docs.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// View or Download Document
router.get('/documents/:docId', authenticate, async (req, res) => {
  try {
    const docRes = await db.query('SELECT file_name, file_path, file_hash FROM documents WHERE id = $1', [req.params.docId]);
    if (docRes.rowCount === 0) return res.status(404).json({ error: 'Document not found' });
    const doc = docRes.rows[0];

    const absolutePath = require('path').join(__dirname, '..', doc.file_path);
    if (!require('fs').existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    try {
      const fileBuffer = await require('fs').promises.readFile(absolutePath);
      const actualHash = require('crypto').createHash('sha256').update(fileBuffer).digest('hex');
      if (doc.file_hash && actualHash !== doc.file_hash) {
        throw new Error("Bit rot or disk corruption detected");
      }
    } catch (e) {
      console.error(`[CRITICAL_FILE_CORRUPTION] File: ${absolutePath}, Error: ${e.message}`);
      return res.status(500).json({ error: 'System unavailable' });
    }

    if (req.query.download === 'true') {
      return res.download(absolutePath, doc.file_name);
    }
    return res.sendFile(absolutePath);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});


// Detailed Property View
router.get('/:id', authenticate, async (req, res) => {
  console.log('PROPERTY_HIT >> GET /:id', req.params.id);
  try {
    const property = await db.query('SELECT p.*, u.full_name as owner_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [req.params.id]);
    if (property.rowCount === 0) return res.status(404).json({ error: 'Operation failed' });
    
    // RBAC Backend enforcement
    const userRole = (req.user.role || '').toLowerCase();
    const p = property.rows[0];
    
    if (userRole === 'citizen' && p.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'notary' && p.status !== 'pending_notary') {
        return res.status(403).json({ error: 'Access denied' });
    }
    // Officer restriction removed

    const docs = await db.query('SELECT id, file_name, created_at FROM documents WHERE property_id = $1', [req.params.id]);
    return res.json({ ...p, documents: docs.rows });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Property History (Property-Level)
router.get('/:id/history', authenticate, async (req, res) => {
  console.log('PROPERTY_HIT >> GET /:id/history', req.params.id);
  try {
    // FIX: BOLA Authorization Check
    const propertyResult = await db.query('SELECT owner_id, status FROM properties WHERE id = $1', [req.params.id]);
    if (propertyResult.rowCount === 0) return res.status(404).json({ error: 'Operation failed' });
    
    const p = propertyResult.rows[0];
    const userRole = (req.user.role || '').toLowerCase();
    
    if (userRole === 'citizen' && p.owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    if (userRole === 'notary' && p.status !== 'pending_notary') {
        return res.status(403).json({ error: 'Access denied' });
    }
    // Officer restriction removed

    const q = `
      SELECT a.id, a.action, a.created_at, a.metadata, COALESCE(u.full_name, 'System Authority') as actor_name, r.name as actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE a.affected_property_id = $1
      ORDER BY a.created_at DESC
    `;
    const result = await db.query(q, [req.params.id]);
    
    // FIX: Merge Transfers table for reliability
    const transfersRes = await db.query(`
      SELECT t.id, t.status, t.created_at, COALESCE(u.full_name, 'System Authority') as actor_name, 'officer' as actor_role
      FROM ownership_transfers t
      LEFT JOIN users u ON t.from_user = u.id
      WHERE t.property_id = $1
    `, [req.params.id]);

    let history = result.rows.map(row => {
      let description = row.action.replace(/_/g, ' ');
      let meta = row.metadata;
      
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch(e) {}
      }

      if (row.action === 'PROPERTY_NOTARY_APPROVE') description = 'Notary Verified Documents';
      if (row.action === 'PROPERTY_OFFICER_APPROVE') description = 'Officer Registered Asset';
      if (row.action === 'PROPERTY_REJECT') description = 'Application Rejected';
      if (row.action === 'OFFICER_APPROVE') description = 'Ownership Transferred';
      if (row.action === 'PROPERTY_REGISTRATION_SUBMITTED') description = 'Initial Registration Submitted';

      return {
        id: row.id,
        action: row.action,
        description: description,
        timestamp: row.created_at,
        actor: row.actor_name,
        role: row.actor_role || 'system',
        metadata: meta
      };
    });

    const transferHistory = transfersRes.rows.map(row => ({
        id: `tf_${row.id}`,
        action: `TRANSFER_${row.status.toUpperCase()}`,
        description: `Transfer ${row.status.replace('_', ' ')}`,
        timestamp: row.created_at,
        actor: row.actor_name,
        role: row.actor_role,
        metadata: { transfer_id: row.id }
    }));

    const merged = [...history, ...transferHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Deduplicate history
    const uniqueHistory = [];
    const seen = new Set();
    for (const event of merged) {
        const uniqueKey = event.metadata?.transfer_id 
            ? `transfer_${event.metadata.transfer_id}`
            : `${new Date(event.timestamp).getTime()}_${event.action}_${event.actor}`;
            
        if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            uniqueHistory.push(event);
        }
    }

    return res.json(uniqueHistory);
  } catch (err) {
    console.error('[PROPERTY HISTORY ERROR]', err.message);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Ownership History
router.get('/:id/ownership-history', authenticate, async (req, res) => {
  try {
    const propertyResult = await db.query('SELECT owner_id, status FROM properties WHERE id = $1', [req.params.id]);
    if (propertyResult.rowCount === 0) return res.status(404).json({ error: 'Property not found' });

    const q = `
      SELECT o.id, u.full_name as owner_name, o.start_date, o.end_date, o.active 
      FROM asset_ownerships o 
      JOIN users u ON o.owner_id = u.id 
      WHERE o.asset_id = $1 
      ORDER BY o.start_date ASC
    `;
    const result = await db.query(q, [req.params.id]);
    
    // If no ownerships recorded yet (maybe an old property), we could fallback to current owner
    if (result.rowCount === 0) {
      const ownerQuery = await db.query('SELECT u.full_name as owner_name, p.created_at as start_date FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [req.params.id]);
      if (ownerQuery.rowCount > 0) {
         return res.json([{ 
           id: 'initial', 
           owner_name: ownerQuery.rows[0].owner_name, 
           start_date: ownerQuery.rows[0].start_date, 
           end_date: null, 
           active: true 
         }]);
      }
    }

    return res.json(result.rows);
  } catch (err) {
    console.error('[OWNERSHIP HISTORY ERROR]', err.message);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Property Report PDF
router.get('/:id/report', authenticate, async (req, res) => {
  try {
    const propertyResult = await db.query('SELECT owner_id FROM properties WHERE id = $1', [req.params.id]);
    if (propertyResult.rowCount === 0) return res.status(404).json({ error: 'Property not found' });
    
    // RBAC: Citizen can only view own property report.
    const userRole = (req.user.role || '').toLowerCase();
    if (userRole === 'citizen' && propertyResult.rows[0].owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Property-Report-${req.params.id.slice(0,8)}.pdf`);
    
    await generatePropertyReportPDF(req.params.id, res);
    
    safeExecute(() => logAudit('REPORT_GENERATED', req.user.id, req.params.id, {}))();
  } catch (err) {
    console.error('[PROPERTY REPORT ERROR]', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'System unavailable' });
    }
  }
});

router.patch('/:id/notary-approve', authenticate, authorize('notary'), async (req, res) => {
  const { signatureData } = req.body;
  if (!signatureData) {
    return res.status(400).json({ error: 'Signature drawing is required.' });
  }

  try {
    await db.withTransaction(async (tx) => {
      const pRes = await tx.query('SELECT type, owner_id, metadata FROM properties WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (pRes.rowCount === 0) throw new Error('Not found');
      const p = pRes.rows[0];

      const isLand = p.type && ['land', 'residential', 'commercial', 'industrial'].includes(p.type.toLowerCase());
      if (isLand) {
        const updateRes = await tx.query(
          `UPDATE properties SET status = 'pending_officer' WHERE id = $1 AND status = 'pending_notary'`, 
          [req.params.id]
        );
        if (updateRes.rowCount === 0) throw new Error('Conflict detected');
      } else {
        // Direct Verification for Non-Land
        const updateRes = await tx.query(
          `UPDATE properties SET status = 'registered' WHERE id = $1 AND status = 'pending_notary'`, 
          [req.params.id]
        );
        if (updateRes.rowCount === 0) throw new Error('Conflict detected');

        // Create Asset and Ownership
        const assetType = p.type.toLowerCase();
        await tx.query(`
          INSERT INTO assets (id, type, reference_id, current_owner_id, status, metadata)
          VALUES ($1, $2, $3, $4, 'active', $5)
          ON CONFLICT (id) DO UPDATE SET status = 'active'
        `, [req.params.id, assetType, req.params.id, p.owner_id, p.metadata]);

        await tx.query(`
          INSERT INTO asset_ownerships (asset_id, owner_id, start_date, active) 
          VALUES ($1, $2, NOW(), true)
          ON CONFLICT DO NOTHING
        `, [req.params.id, p.owner_id]);

        // GENERATE CERTIFICATE
        await generateCertificate(req.params.id, p.owner_id, req.user.id, null, tx);
      }
      
      const sigHash = crypto.createHash('sha256').update(signatureData + req.params.id + 'notary' + Date.now()).digest('hex');
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      await tx.query(`
        INSERT INTO digital_signatures (property_id, user_id, role, signature_type, signature_image, signature_hash, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.params.id, req.user.id, 'notary', 'notary_signature', signatureData, sigHash, ipAddress]);

      await logEvent({
        event_type: 'PROPERTY_NOTARY_APPROVE',
        actor_id: req.user.id,
        asset_id: req.params.id,
        role: 'notary',
        payload_json: { owner_id: p.owner_id, status: isLand ? 'pending_officer' : 'registered' }
      }, tx);
    });

    safeExecute(() => logAudit('PROPERTY_NOTARY_APPROVE', req.user.id, req.params.id))();
    
    db.query('SELECT owner_id, email, full_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [req.params.id])
      .then(async res => {
         if (res.rowCount > 0) {
           notificationService.sendPropertyNotaryApproved(res.rows[0].email, res.rows[0].full_name, req.params.id).catch(console.error);
           const { notifyService } = require('../config/notificationHelper');
           
           // Check if it's pending officer or fully registered
           const isLandCheck = await db.query('SELECT type FROM properties WHERE id = $1', [req.params.id]);
           const type = isLandCheck.rows[0].type;
           const isLand = type && ['land', 'residential', 'commercial', 'industrial'].includes(type.toLowerCase());
           
           if (isLand) {
             await notifyService({
               event_type: 'NEW_PROPERTY_WAITING_VERIFICATION',
               actor_id: req.user.id,
               asset_id: req.params.id,
               payload_json: { owner_id: res.rows[0].owner_id }
             });
             await notifyService({
               event_type: 'NOTARY_CERTIFICATION_COMPLETED',
               actor_id: req.user.id,
               asset_id: req.params.id,
               payload_json: { owner_id: res.rows[0].owner_id }
             });
           } else {
             await notifyService({
               event_type: 'PROPERTY_APPROVED',
               actor_id: req.user.id,
               asset_id: req.params.id,
               payload_json: { owner_id: res.rows[0].owner_id }
             });
           }
         }
      }).catch(console.error);

    return res.json({ message: `Registry status updated` });
  } catch (err) {
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Update Property Status - Officer Stage
router.patch('/:id/officer-approve', authenticate, authorize('officer'), async (req, res) => {
  const { signatureData } = req.body;
  if (!signatureData) {
    return res.status(400).json({ error: 'Signature drawing is required.' });
  }

  try {
    await db.withTransaction(async (tx) => {
      const pRes = await tx.query('SELECT type, owner_id, metadata FROM properties WHERE id = $1 FOR UPDATE', [req.params.id]);
      if (pRes.rowCount === 0) throw new Error('Not found');
      const p = pRes.rows[0];

      const isLand = p.type && ['land', 'residential', 'commercial', 'industrial'].includes(p.type.toLowerCase());
      if (!isLand) throw new Error('Invalid operation for non-land asset');

      const updateRes = await tx.query(
        `UPDATE properties SET status = 'registered' WHERE id = $1 AND status = 'pending_officer'`, 
        [req.params.id]
      );
      if (updateRes.rowCount === 0) throw new Error('Conflict detected');

      // Create Asset and Ownership
      await tx.query(`
        INSERT INTO assets (id, type, reference_id, current_owner_id, status, metadata)
        VALUES ($1, 'land', $2, $3, 'active', $4)
        ON CONFLICT (id) DO UPDATE SET status = 'active'
      `, [req.params.id, req.params.id, p.owner_id, p.metadata]);

      await tx.query(`
        INSERT INTO asset_ownerships (asset_id, owner_id, start_date, active) 
        VALUES ($1, $2, NOW(), true)
        ON CONFLICT DO NOTHING
      `, [req.params.id, p.owner_id]);

      // GENERATE CERTIFICATE
      await generateCertificate(req.params.id, p.owner_id, req.user.id, null, tx);
      
      const sigHash = crypto.createHash('sha256').update(signatureData + req.params.id + 'officer' + Date.now()).digest('hex');
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

      await tx.query(`
        INSERT INTO digital_signatures (property_id, user_id, role, signature_type, signature_image, signature_hash, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [req.params.id, req.user.id, 'officer', 'officer_signature', signatureData, sigHash, ipAddress]);

      // LOG AUDIT INSIDE TRANSACTION
      await logAudit('PROPERTY_OFFICER_APPROVE', req.user.id, req.params.id, {}, tx);

      await logEvent({
        event_type: 'PROPERTY_OFFICER_APPROVE',
        actor_id: req.user.id,
        asset_id: req.params.id,
        role: 'officer',
        payload_json: { owner_id: p.owner_id }
      }, tx);
    });

    db.query('SELECT owner_id, email, full_name FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = $1', [req.params.id])
      .then(async res => {
         if (res.rowCount > 0) {
           notificationService.sendPropertyOfficerApproved(res.rows[0].email, res.rows[0].full_name, req.params.id).catch(console.error);
           const { notifyService } = require('../config/notificationHelper');
           
           await notifyService({
             event_type: 'PROPERTY_APPROVED',
             actor_id: req.user.id,
             asset_id: req.params.id,
             payload_json: { owner_id: res.rows[0].owner_id }
           });
           await notifyService({
             event_type: 'PROPERTY_APPROVED_OFFICER',
             actor_id: req.user.id,
             asset_id: req.params.id,
             payload_json: { owner_id: res.rows[0].owner_id }
           });
         }
      }).catch(console.error);

    return res.json({ message: `Registry status updated` });
  } catch (err) {
    console.error('[OFFICER APPROVE FAILED]', err.message, err.stack);
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Reject Property Application (Notary/Officer)
router.patch('/:id/reject', authenticate, authorize('notary', 'officer', 'admin'), async (req, res) => {
  try {
    const propertyData = await db.withTransaction(async (tx) => {
      const updateRes = await tx.query(
        `UPDATE properties SET status = 'rejected' WHERE id = $1 AND status IN ('pending_notary', 'pending_officer') RETURNING owner_id, title`, 
        [req.params.id]
      );
      if (updateRes.rowCount === 0) throw new Error('Conflict detected');
      
      // LOG AUDIT INSIDE TRANSACTION
      await logAudit('PROPERTY_REJECT', req.user.id, req.params.id, {}, tx);
      
      return updateRes.rows[0];
    });

    const { notifyService } = require('../config/notificationHelper');
    await notifyService({
      event_type: 'PROPERTY_REJECTED',
      actor_id: req.user.id,
      asset_id: req.params.id,
      payload_json: { owner_id: propertyData.owner_id }
    });

    return res.json({ message: `Registry status updated` });
  } catch (err) {
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

// Lock Property (Officer only)
router.patch('/:id/lock', authenticate, async (req, res) => {
  if (req.user.role !== 'officer') {
    return res.status(403).json({ error: 'Access denied. Only Registry Officer can perform this action.' });
  }
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Lock reason is required.' });

    const propertyData = await db.withTransaction(async (tx) => {
      const updateRes = await tx.query(
        `UPDATE properties SET status = 'LOCKED' WHERE id = $1 RETURNING *`, 
        [req.params.id]
      );
      if (updateRes.rowCount === 0) throw new Error('Not found');
      
      const prop = updateRes.rows[0];
      
      const { logAudit } = require('../utils/auditLogger');
      await logAudit('PROPERTY_LOCKED', req.user.id, req.params.id, { reason }, tx);
      
      const { logEvent } = require('../utils/eventLedger');
      await logEvent({
        event_type: 'PROPERTY_LOCKED',
        actor_id: req.user.id,
        asset_id: req.params.id,
        role: req.user.role,
        payload_json: { status: 'LOCKED', reason }
      }, tx);
      
      return prop;
    });

    const officerName = req.user.full_name || req.user.name || 'System Officer';

    // Notify outside transaction
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'PROPERTY_LOCKED',
        actor_id: req.user.id,
        asset_id: req.params.id,
        payload_json: { owner_id: propertyData.owner_id, reason, property_name: propertyData.title, officer_name: officerName }
      });
      await notifyService({
        event_type: 'PROPERTY_LOCKED_OFFICER',
        actor_id: req.user.id,
        asset_id: req.params.id,
        payload_json: { property_name: propertyData.title }
      });
    } catch (notifErr) {
      console.error('NOTIFICATION_FAILED:', notifErr);
    }

    notificationService.sendPropertyLocked(req.user, propertyData).catch(console.error);

    return res.json({ message: `Property locked`, property: propertyData });
  } catch (err) {
    console.error('[PROPERTY_LOCK_ERROR]', err);
    return res.status(500).json({ error: 'System unavailable', details: err.message });
  }
});

// Unlock Property (Officer only)
router.patch('/:id/unlock', authenticate, async (req, res) => {
  if (req.user.role !== 'officer') {
    return res.status(403).json({ error: 'Access denied. Only Registry Officer can perform this action.' });
  }
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Unlock reason is required.' });

    const propertyData = await db.withTransaction(async (tx) => {
      const updateRes = await tx.query(
        `UPDATE properties SET status = 'ACTIVE' WHERE id = $1 AND status = 'LOCKED' RETURNING *`, 
        [req.params.id]
      );
      if (updateRes.rowCount === 0) throw new Error('Not found or not locked');
      
      const prop = updateRes.rows[0];
      
      const { logAudit } = require('../utils/auditLogger');
      await logAudit('PROPERTY_UNLOCKED', req.user.id, req.params.id, { reason }, tx);
      
      const { logEvent } = require('../utils/eventLedger');
      await logEvent({
        event_type: 'PROPERTY_UNLOCKED',
        actor_id: req.user.id,
        asset_id: req.params.id,
        role: req.user.role,
        payload_json: { status: 'ACTIVE', reason }
      }, tx);
      
      return prop;
    });

    const officerName = req.user.full_name || req.user.name || 'System Officer';

    // Notify outside transaction
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'PROPERTY_UNLOCKED',
        actor_id: req.user.id,
        asset_id: req.params.id,
        payload_json: { owner_id: propertyData.owner_id, reason, property_name: propertyData.title, officer_name: officerName }
      });
      await notifyService({
        event_type: 'PROPERTY_UNLOCKED_OFFICER',
        actor_id: req.user.id,
        asset_id: req.params.id,
        payload_json: { property_name: propertyData.title }
      });
    } catch (notifErr) {
      console.error('NOTIFICATION_FAILED:', notifErr);
    }

    notificationService.sendPropertyUnlocked(req.user, propertyData).catch(console.error);

    return res.json({ message: `Property unlocked`, property: propertyData });
  } catch (err) {
    console.error('[PROPERTY_UNLOCK_ERROR]', err);
    if (err.message === 'Not found or not locked') return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: 'System unavailable', details: err.message });
  }
});

// Update Property Visibility (Owner only)
router.patch('/:id/visibility', authenticate, async (req, res) => {
  try {
    const { visibility } = req.body;
    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({ error: 'Invalid visibility value.' });
    }

    const result = await db.query('SELECT owner_id FROM properties WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Property not found' });
    
    // Only owner can change visibility
    if (result.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the property owner can change visibility.' });
    }

    const updateRes = await db.withTransaction(async (tx) => {
      const up = await tx.query(
        `UPDATE properties SET visibility = $1 WHERE id = $2 RETURNING *`, 
        [visibility, req.params.id]
      );
      
      await logAudit('PROPERTY_VISIBILITY_CHANGED', req.user.id, req.params.id, { visibility }, tx);
      await logEvent({
        event_type: 'PROPERTY_VISIBILITY_CHANGED',
        actor_id: req.user.id,
        asset_id: req.params.id,
        role: req.user.role,
        payload_json: { visibility }
      }, tx);

      return up.rows[0];
    });

    return res.json({ message: 'Property visibility updated successfully', visibility: updateRes.visibility });
  } catch (err) {
    console.error('[PROPERTY_VISIBILITY_ERROR]', err);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
