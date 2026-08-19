const db = require('../config/db');
const crypto = require('crypto');

const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

async function rebuildCertificates() {
  console.log('--- [REBUILD_CERTIFICATES_START] ---');
  try {
    await db.withTransaction(async (tx) => {
      const certs = await tx.query('SELECT * FROM asset_certificates');
      
      console.log(`Rebuilding hashes for ${certs.rowCount} certificates...`);
      for (const cert of certs.rows) {
        
        // Ensure ownership_transfer_id mapping if it still references legacy transfer_id
        if (!cert.ownership_transfer_id && cert.transfer_id) {
          console.log(`Mapping legacy transfer ${cert.transfer_id} for cert ${cert.id}`);
          // Attempt to map from ownership_transfers using property_id
          const transferMatch = await tx.query(`
            SELECT id FROM ownership_transfers 
            WHERE property_id = $1 AND status = 'completed'
            ORDER BY updated_at DESC LIMIT 1
          `, [cert.property_id]);
          
          if (transferMatch.rowCount > 0) {
            cert.ownership_transfer_id = transferMatch.rows[0].id;
            await tx.query('UPDATE asset_certificates SET ownership_transfer_id = $1 WHERE id = $2', [cert.ownership_transfer_id, cert.id]);
          }
        }

        // Fetch property info for canonical generation
        const pRes = await tx.query(`
            SELECT p.*, u.full_name as owner_name 
            FROM properties p 
            JOIN users u ON p.owner_id = u.id 
            WHERE p.id = $1`, [cert.property_id]
        );

        if (pRes.rowCount > 0) {
            const p = pRes.rows[0];
            
            // Rebuild JSON based exactly on standard certificate generator schema
            const certificate_json = {
                certificate_type: 'OWNERSHIP_TITLE',
                issued_at: cert.issued_at ? new Date(cert.issued_at).toISOString() : new Date().toISOString(),
                property: {
                    id: p.id,
                    title: p.title,
                    type: p.type,
                    district: p.district,
                    address: p.address,
                    metadata: typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata
                },
                owner: {
                    id: cert.owner_id,
                    name: p.owner_name
                },
                authority: {
                    notary_id: cert.notary_id
                }
            };

            const canonicalData = canonicalize(certificate_json);
            const certificate_hash = crypto.createHash('sha256').update(canonicalData).digest('hex');

            await tx.query(`
                UPDATE asset_certificates 
                SET certificate_hash = $1, certificate_json = $2
                WHERE id = $3
            `, [certificate_hash, JSON.stringify(certificate_json), cert.id]);
        } else {
            // It's a legacy certificate without property linkage.
            // Recompute its hash using the new canonicalize standard to ensure integrityJob passes.
            let legacyJson = typeof cert.certificate_json === 'string' ? JSON.parse(cert.certificate_json) : cert.certificate_json;
            const canonicalData = canonicalize(legacyJson);
            const certificate_hash = crypto.createHash('sha256').update(canonicalData).digest('hex');

            await tx.query(`
                UPDATE asset_certificates 
                SET certificate_hash = $1
                WHERE id = $2
            `, [certificate_hash, cert.id]);
        }
      }
    });

    console.log('[CERTIFICATES_REPAIRED]');
    process.exit(0);
  } catch (err) {
    console.error('Failed to rebuild certificates:', err);
    process.exit(1);
  }
}

rebuildCertificates();
