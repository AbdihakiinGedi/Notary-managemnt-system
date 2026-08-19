const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

const idStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/identity');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `id-${req.user.id}-${Date.now()}${ext}`);
  }
});

const idUpload = multer({
  storage: idStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
    }
  }
});

router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.profile_photo, u.national_id, r.name as role_name 
       FROM users u JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.get('/search', authenticate, async (req, res) => {
  try {
    const targetRole = req.query.role || 'citizen';
    const result = await db.query(
      `SELECT id, full_name as name, email FROM users WHERE id != $1 AND role_id = (SELECT id FROM roles WHERE name = $2) AND is_active = true`,
      [req.user.id, targetRole]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.patch('/profile', authenticate, async (req, res) => {
  const { full_name, phone } = req.body;
  try {
    await db.withTransaction(async (tx) => {
      const result = await tx.query('UPDATE users SET full_name = $1, phone = $2 WHERE id = $3', [full_name, phone, req.user.id]);
      if (result.rowCount === 0) throw new Error("Conflict detected");
    });
    return res.json({ message: 'Profile updated' });
  } catch (error) {
    if (error.message === 'Conflict detected') return res.status(409).json({ error: 'Conflict detected' });
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.post('/profile/photo', authenticate, (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const photoPath = `/uploads/profiles/${req.file.filename}`;
      await db.query('UPDATE users SET profile_photo = $1 WHERE id = $2', [photoPath, req.user.id]);
      return res.json({ message: 'Profile photo updated successfully', profile_photo: photoPath });
    } catch (dbErr) {
      return res.status(500).json({ error: 'System unavailable' });
    }
  });
});

router.delete('/profile/photo', authenticate, async (req, res) => {
  try {
    const result = await db.query('SELECT profile_photo FROM users WHERE id = $1', [req.user.id]);
    const photoPath = result.rows[0]?.profile_photo;
    
    if (photoPath) {
      const absolutePath = path.join(__dirname, '..', photoPath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
      await db.query('UPDATE users SET profile_photo = NULL WHERE id = $1', [req.user.id]);
    }
    
    return res.json({ message: 'Profile photo removed' });
  } catch (error) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.post('/verification', authenticate, (req, res) => {
  idUpload.single('document')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No document uploaded' });

    try {
      const docPath = `/uploads/identity/${req.file.filename}`;
      await db.query(
        "UPDATE users SET verification_document = $1, id_document_url = $1, account_status = 'pending', verification_status = 'pending', rejection_reason = NULL WHERE id = $2",
        [docPath, req.user.id]
      );
      
      const { logAudit } = require('../utils/auditLogger');
      await logAudit('DOCUMENT_RESUBMITTED', req.user.id, null, { doc: docPath });

      return res.json({ message: 'Identity document submitted for verification', document_url: docPath, verification_status: 'pending', account_status: 'pending' });
    } catch (dbErr) {
      return res.status(500).json({ error: 'System unavailable' });
    }
  });
});

router.get('/verification/status', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT account_status as verification_status, account_status, rejection_reason, verification_document as id_document_url FROM users WHERE id = $1',
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.get('/activity', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT l.id, l.action, l.created_at as timestamp, 
              REPLACE(INITCAP(l.action), '_', ' ') as description, 
              COALESCE(p.title, p2.title, p3.title, p4.title, p5.title) as property_title, 
              u.full_name as user_name
       FROM audit_logs l
       LEFT JOIN properties p ON l.affected_property_id = p.id::text
       LEFT JOIN ownership_transfers t ON t.id::text = l.metadata->>'transfer_id'
       LEFT JOIN properties p2 ON p2.id = t.property_id
       LEFT JOIN transfer_agreements ta ON ta.id::text = l.metadata->>'agreement_id'
       LEFT JOIN ownership_transfers t3 ON t3.id = ta.transfer_id
       LEFT JOIN properties p3 ON p3.id = t3.property_id
       LEFT JOIN properties p4 ON p4.id::text = l.metadata->>'property_id'
       LEFT JOIN notary_certificates nc ON nc.id::text = l.metadata->>'certificate_id'
       LEFT JOIN ownership_transfers t4 ON t4.notary_request_id = nc.request_id
       LEFT JOIN properties p5 ON p5.id = t4.property_id
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.user_id = $1 
       ORDER BY l.created_at DESC 
       LIMIT 50`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: 'System unavailable' });
  }
});

module.exports = router;
