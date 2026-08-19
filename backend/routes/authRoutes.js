const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const upload = require('../utils/upload');
const { logAuditEvent } = require('../services/auditService');

router.get('/login', async (req, res) => {
  // Reuse POST login logic for compatibility
  // Extract credentials from query params (e.g., ?email=...&password=...)
  const { email, password } = req.query;
  if (!email || !password) {
    return res.status(400).json({ error: 'Operation failed' });
  }
  // Forward to the same logic as POST
  // Note: we call the same function body by delegating to the POST handler
  // Create a mock request object
  req.body = { email, password };
  // Call the existing POST handler defined later
  const next = () => {};
  // Since the POST handler is defined earlier in the same file, we can require it via router.stack
  const postHandler = router.stack.find(layer => layer.route && layer.route.path === '/login' && layer.route.methods.post).handle;
  return postHandler(req, res, next);
});
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Operation failed' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = $1`, 
      [normalizedEmail]
    );

    if (result.rowCount === 0) return res.status(401).json({ error: 'Incorrect email or password.' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect email or password.' });

    if (user.role_name === 'citizen') {
      if (user.account_status === 'pending' || user.account_status === 'rejected') {
        const msg = user.account_status === 'pending' ? 'Your account is awaiting administrator approval.' : 'Your account has been rejected.';
        return res.status(401).json({ error: msg });
      }
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Your account has been deactivated.' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role_name, 
        name: user.full_name,
        account_status: user.account_status,
        verified: user.verified
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key_123',
      { expiresIn: '8h' }
    );

    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.full_name, 
        full_name: user.full_name,
        national_id: user.national_id,
        role: user.role_name, 
        email: user.email, 
        profile_photo: user.profile_photo,
        account_status: user.account_status,
        verified: user.verified,
        rejection_reason: user.rejection_reason
      } 
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    return res.status(500).json({ error: 'System unavailable' });
  }
});

router.post('/register', upload.single('verification_document'), async (req, res) => {
  const { full_name, email, password, phone, verification_type, verification_number } = req.body;
  if (!full_name || !email || !password || !verification_type || !verification_number) {
    return res.status(400).json({ error: 'Please fill in all required fields' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'ID Document is required' });
  }

  const verification_document = `/uploads/documents/${req.file.filename}`;
  const normalizedEmail = email.trim().toLowerCase();
  
  try {
    let newUserId;
    await db.withTransaction(async (tx) => {
      const hash = await bcrypt.hash(password, 10);
      const roleResult = await tx.query("SELECT id FROM roles WHERE LOWER(name) = 'citizen'");
      if (roleResult.rowCount === 0) throw new Error('Role not found');
      
      const insertResult = await tx.query(
        `INSERT INTO users (
          full_name, email, password_hash, role_id, phone, 
          verification_type, verification_number, verification_document, 
          is_active, account_status, verified, national_id
         ) 
         VALUES ($1, $2, $3, $4, $5, 'national_id', $6, $7, true, 'pending', false, $6) RETURNING id`,
        [full_name, normalizedEmail, hash, roleResult.rows[0].id, phone || null, verification_number, verification_document]
      );
      if (insertResult.rowCount !== 1) throw new Error('Failed to create account');
      newUserId = insertResult.rows[0].id;
    });

    try {
      await logAuditEvent({
        user_id: newUserId,
        action: 'USER_REGISTERED',
        ip_address: req.ip,
        request_url: req.originalUrl,
        method: req.method,
        status_code: 201,
        user_agent: req.headers['user-agent']
      });

      const emailService = require('../services/emailService');
      await emailService.sendRegistrationReceivedEmail({ full_name, email });
      
      const adminResult = await db.query(`SELECT email FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'admin' AND u.is_active = true`);
      if (adminResult.rowCount > 0) {
        const adminEmails = adminResult.rows.map(r => r.email);
        await emailService.notifyAdminNewUser(adminEmails, { full_name, email });
      }

      const { notifyService } = require('../config/notificationHelper');
      await notifyService({
        event_type: 'REGISTRATION_SUBMITTED',
        actor_id: newUserId,
        payload_json: {}
      });
      await notifyService({
        event_type: 'USER_REGISTERED',
        actor_id: newUserId,
        payload_json: { 
          action_link: '/admin/users',
          action_label: 'Admin Users page'
        }
      });
    } catch (auditErr) {
      console.error('[POST-REGISTRATION ERROR]', auditErr);
    }

    return res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    console.error('[REGISTER ERROR]', err.message);
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

module.exports = router;
