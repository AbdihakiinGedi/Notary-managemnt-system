const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const { verifyLedger } = require('../utils/eventLedger');

router.get('/', authenticate, async (req, res) => {
  try {
    const userRole = (req.user.role || '').toLowerCase();
    const userId = req.user.id;
    const mode = req.query.mode;

    // Admin-only Global Forensic Ledger
    if (mode === 'ledger' && userRole === 'admin') {
      const integrity = await verifyLedger();
      const events = await db.query(
        `SELECT e.*, u.full_name as actor_name 
         FROM event_log e 
         LEFT JOIN users u ON e.actor_id = u.id 
         ORDER BY e.created_at DESC LIMIT 100`
      );
      return res.json({ 
        type: 'ledger',
        integrity,
        history: events.rows 
      });
    }

    let history = [];

    // Audit logs strictly for the logged-in user (All roles)
    const auditRes = await db.query(
      `SELECT 'audit' as type, a.action, a.created_at, a.metadata, NULL as asset_type,
              COALESCE(p.title, p2.title, p3.title, p4.title, p5.title) as related_property,
              REPLACE(INITCAP(a.action), '_', ' ') as description
       FROM audit_logs a
       LEFT JOIN properties p ON p.id::text = a.affected_property_id
       LEFT JOIN ownership_transfers t ON t.id::text = a.metadata->>'transfer_id'
       LEFT JOIN properties p2 ON p2.id = t.property_id
       LEFT JOIN transfer_agreements ta ON ta.id::text = a.metadata->>'agreement_id'
       LEFT JOIN ownership_transfers t2 ON t2.id = ta.transfer_id
       LEFT JOIN properties p3 ON p3.id = t2.property_id
       LEFT JOIN properties p4 ON p4.id::text = a.metadata->>'property_id'
       LEFT JOIN notary_certificates nc ON nc.id::text = a.metadata->>'certificate_id'
       LEFT JOIN ownership_transfers t3 ON t3.notary_request_id = nc.request_id
       LEFT JOIN properties p5 ON p5.id = t3.property_id
       WHERE a.user_id = $1 
       ORDER BY a.created_at DESC LIMIT 100`,
      [userId]
    );

    // Transfers explicitly involving the logged-in user
    let transferQuery = '';
    let transferParams = [];

    if (userRole === 'citizen') {
      transferQuery = `
        SELECT 'transfer' as type, t.status, t.created_at, p.type as asset_type, p.title as related_property, t.id as transfer_id,
               CASE WHEN t.from_user = $1 THEN 'SENT' ELSE 'RECEIVED' END as direction,
               t.status as action,
               'Transfer ' || INITCAP(t.status) as description
        FROM ownership_transfers t 
        JOIN properties p ON t.property_id = p.id 
        WHERE t.from_user = $1 OR t.to_user = $1 
        ORDER BY t.created_at DESC LIMIT 100
      `;
      transferParams = [userId];
    } else if (userRole === 'notary') {
      transferQuery = `
        SELECT 'transfer' as type, t.status, t.created_at, p.type as asset_type, p.title as related_property, t.status as action,
               'Transfer ' || INITCAP(t.status) as description
        FROM ownership_transfers t 
        JOIN properties p ON t.property_id = p.id 
        WHERE t.notary_request_id = $1
        ORDER BY t.created_at DESC LIMIT 100
      `;
      transferParams = [userId];
    }

    let transferRows = [];
    if (transferQuery) {
      const tRes = await db.query(transferQuery, transferParams);
      transferRows = tRes.rows;
    }
    
    history = [...auditRes.rows, ...transferRows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ history });
  } catch (error) {
    console.error('History API Error:', error);
    res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
