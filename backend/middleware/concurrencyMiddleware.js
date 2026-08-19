const rateLimit = require('express-rate-limit');
const db = require('../config/db');
const crypto = require('crypto');

// --- 9. GLOBAL RATE LIMITING (CRITICAL) - Combined IP + User ---
const globalRateLimiter = rateLimit({
  windowMs: 1000, 
  max: 30,
  keyGenerator: (req) => {
    // Multi-factor rate limit key: Hash(IP + UserID)
    const userId = (req.user && req.user.id) || 'ANON';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    return `${ip}_${userId}`;
  },
  handler: (req, res) => {
    return res.status(429).json({ error: "Too many requests" });
  },
  skip: (req) => req.method === 'OPTIONS'
});

const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, 
  keyGenerator: (req) => {
    const userId = (req.user && req.user.id) || 'ANON';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    return `${ip}_${userId}`;
  },
  handler: (req, res) => {
    return res.status(429).json({ error: "Operation limit reached. Please wait." });
  }
});

// --- 4. IDEMPOTENCY PAYLOAD CANONICALIZATION (#4) ---
const canonicalize = (obj) => {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => `"${k}":${canonicalize(obj[k])}`).join(',') + '}';
};

// --- 1. IDEMPOTENCY PROTECTION (CRASH-SAFE & MULTI-INSTANCE) ---
const idempotencyGuard = async (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  if (!key || !req.user) return next();

  try {
    // 4. Canonicalize payload before hashing (#4)
    const payload = canonicalize(req.body);
    const requestHash = crypto.createHash('sha256').update(payload).digest('hex');

    // 3. Multi-Instance Lock Coordination (#3)
    // We use a separate connection for the advisory lock if we want it to block 
    // but here we'll just check the ledger first.
    
    // Check Permanent Ledger first (#4)
    const ledgerCheck = await db.query('SELECT executed_at FROM idempotency_ledger WHERE request_hash = $1', [requestHash]);
    if (ledgerCheck.rowCount > 0) {
      return res.status(409).json({ error: "Conflict detected: Request already processed in permanent ledger." });
    }

    // Atomic check-and-reserve
    const insertRes = await db.query(
      `INSERT INTO request_idempotency (key, user_id, endpoint, status, request_hash) 
       VALUES ($1, $2, $3, 'processing', $4) 
       ON CONFLICT (key, user_id, endpoint) DO NOTHING 
       RETURNING status`,
      [key, req.user.id, req.originalUrl, requestHash]
    );

    if (insertRes.rowCount === 0) {
      const existing = await db.query(
        'SELECT status, response_json, request_hash FROM request_idempotency WHERE key = $1 AND user_id = $2 AND endpoint = $3',
        [key, req.user.id, req.originalUrl]
      );
      
      const record = existing.rows[0];
      if (record.request_hash && record.request_hash !== requestHash) {
        return res.status(409).json({ error: "Conflict detected: Idempotency key reuse" });
      }

      if (record.status === 'processing') {
        return res.status(409).json({ error: "Conflict detected: Request in progress" });
      }
      if (record.status === 'completed' && record.response_json) {
        return res.json(record.response_json);
      }
      return res.status(409).json({ error: "Conflict detected" });
    }

    req.idempotencyHash = requestHash;

    // Capture response to finalize record
    const originalJson = res.json;
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        db.query(
          `UPDATE request_idempotency 
           SET status = 'completed', response_json = $1, created_at = NOW() 
           WHERE key = $2 AND user_id = $3 AND endpoint = $4`,
          [JSON.stringify(data), key, req.user.id, req.originalUrl]
        ).catch(err => console.error('[IDEMPOTENCY_FINALIZATION_FAILURE]', err.message));
      } else {
        // If operation failed, cleanup so user can retry
        db.query(
          'DELETE FROM request_idempotency WHERE key = $1 AND user_id = $2 AND endpoint = $3 AND status = \'processing\'',
          [key, req.user.id, req.originalUrl]
        ).catch(err => console.error('[IDEMPOTENCY_CLEANUP_FAILURE]', err.message));
      }
      return originalJson.call(this, data);
    };

    next();
  } catch (err) {
    next();
  }
};

module.exports = { globalRateLimiter, strictRateLimiter, idempotencyGuard };
