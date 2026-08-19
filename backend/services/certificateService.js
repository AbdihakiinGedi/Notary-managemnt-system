const db = require('../config/db');
const crypto = require('crypto');
const notificationService = require('./notificationService');

const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

const generateCertificate = async (propertyId, ownerId, notaryId, ownershipTransferId = null, tx = null) => {
  try {
    const client = tx || db;

    if (ownershipTransferId) {
      const existing = await client.query('SELECT id FROM asset_certificates WHERE ownership_transfer_id = $1', [ownershipTransferId]);
      if (existing.rowCount > 0) {
        console.log(`[CERT_DEDUPLICATED] Certificate already exists for transfer: ${ownershipTransferId}`);
        return existing.rows[0].id;
      }
    }
    
    // 1. Fetch Property and Owner Info
    const pRes = await client.query(`
      SELECT p.*, u.full_name as owner_name 
      FROM properties p 
      JOIN users u ON p.owner_id = u.id 
      WHERE p.id = $1`, [propertyId]);
    
    if (pRes.rowCount === 0) throw new Error('Property not found');
    const p = pRes.rows[0];

    // 2. Build Certificate JSON
    const certificate_json = {
      certificate_type: 'OWNERSHIP_TITLE',
      issued_at: new Date().toISOString(),
      property: {
        id: p.id,
        title: p.title,
        type: p.type,
        district: p.district,
        address: p.address,
        metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata
      },
      owner: {
        id: ownerId,
        name: p.owner_name
      },
      authority: {
        notary_id: notaryId
      }
    };

    // 3. Compute Hash
    const canonicalData = canonicalize(certificate_json);
    const certificate_hash = crypto.createHash('sha256').update(canonicalData).digest('hex');

    // 4. Invalidate Old Certificates
    await client.query(`
      UPDATE asset_certificates
      SET status = 'invalid'
      WHERE property_id = $1
      AND status = 'valid'
    `, [propertyId]);

    // 5. Atomic Insert
    const certRes = await client.query(`
      INSERT INTO asset_certificates (property_id, owner_id, notary_id, ownership_transfer_id, certificate_hash, certificate_json, status)
      VALUES ($1, $2, $3, $4::uuid, $5, $6, 'valid')
      RETURNING id`,
      [propertyId, ownerId, notaryId, ownershipTransferId, certificate_hash, JSON.stringify(certificate_json)]
    );

    const ownerRes = await client.query('SELECT email FROM users WHERE id = $1', [ownerId]);
    if (ownerRes.rowCount > 0) {
        notificationService.sendCertificateGenerated(ownerRes.rows[0].email, p.owner_name, propertyId, certRes.rows[0].id).catch(console.error);
        
        const { notifyService } = require('../config/notificationHelper');
        notifyService({
            event_type: 'CERTIFICATE_GENERATION_SUCCESS',
            actor_id: ownerId,
            payload_json: { owner_id: ownerId, certificate_id: certRes.rows[0].id }
        }).catch(console.error);
    }

    return certRes.rows[0].id;
  } catch (err) {
    console.error('[CERTIFICATE_GENERATION_FAILED] Reason:', err.message);
    try {
      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'CERTIFICATE_GENERATION_FAILED',
        payload_json: { message: `Failed certificate generation for property: ${propertyId}, Owner: ${ownerId}, Notary: ${notaryId}. Error: ${err.message}` },
        category: 'security'
      });
    } catch (notifyErr) {
      console.error('Failed to notify certificate failure:', notifyErr.message);
    }
    throw err;
  }
};

module.exports = { generateCertificate };
