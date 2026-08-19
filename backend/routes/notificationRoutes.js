const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    return res.json(result.rows);
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.get('/unread', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    return res.json({ unread: parseInt(result.rows[0].count) });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await db.withTransaction(async (tx) => {
      const result = await tx.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (result.rowCount === 0) throw new Error("Conflict detected");
    });
    return res.json({ 
      success: true, 
      notification: { 
        id: req.params.id, 
        is_read: true 
      } 
    });
  } catch (err) {
    if (err.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const result = await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    return res.json({ success: true, count: result.rowCount });
  } catch (err) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
