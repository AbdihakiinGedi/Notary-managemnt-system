const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// GET /api/assets/search - Sovereign Asset Search
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      query, 
      type, 
      district, 
      status, 
      page = 1, 
      limit = 10 
    } = req.query;

    const userRole = (req.user.role || '').toLowerCase();
    const userId = req.user.id;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT a.*, p.title, p.address, p.district, u.full_name as owner_name,
             ao.active as is_active_owner
      FROM assets a
      LEFT JOIN properties p ON a.reference_id = p.id::text
      LEFT JOIN asset_ownerships ao ON a.id = ao.asset_id AND ao.active = true
      LEFT JOIN users u ON ao.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // 1. RBAC Enforcement (#Citizen Privacy)
    if (userRole === 'citizen') {
      sql += ` AND ao.owner_id = $${params.length + 1}`;
      params.push(userId);
    } else if (!['officer', 'admin', 'notary'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 2. Polymorphic Metadata Search (VIN, Plate, Wallet, etc.)
    if (query) {
      const pIdx = params.length + 1;
      sql += ` AND (
        a.id::text ILIKE $${pIdx} OR 
        p.title ILIKE $${pIdx} OR 
        p.address ILIKE $${pIdx} OR 
        u.full_name ILIKE $${pIdx} OR
        a.metadata->>'vin' ILIKE $${pIdx} OR
        a.metadata->>'plate_number' ILIKE $${pIdx} OR
        a.metadata->>'wallet_address' ILIKE $${pIdx} OR
        a.metadata->>'company_name' ILIKE $${pIdx} OR
        a.metadata->>'deed_number' ILIKE $${pIdx}
      )`;
      params.push(`%${query}%`);
    }

    if (type) {
      sql += ` AND a.type = $${params.length + 1}`;
      params.push(type);
    }

    if (district) {
      sql += ` AND p.district = $${params.length + 1}`;
      params.push(district);
    }

    // 3. Enumeration Protection (#Rate Limiting & Pagination)
    sql += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(sql, params);

    // Count for pagination
    const countSql = `
      SELECT COUNT(*) 
      FROM assets a
      LEFT JOIN asset_ownerships ao ON a.id = ao.asset_id AND ao.active = true
      LEFT JOIN users u ON ao.owner_id = u.id
      LEFT JOIN properties p ON a.reference_id = p.id::text
      WHERE 1=1 ${userRole === 'citizen' ? 'AND ao.owner_id = $1' : ''}
    `;
    const countParams = userRole === 'citizen' ? [userId] : [];
    const countResult = await db.query(countSql, countParams);

    res.json({
      assets: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
    });
  } catch (err) {
    console.error('[ASSET_SEARCH_ERROR]', err.message);
    res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
