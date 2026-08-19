const jwt = require('jsonwebtoken');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && (authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader);

  if (!token) {
    return res.status(401).json({ error: 'Access denied.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_123');
    
    // DB-Authoritative check (Zero-Trust)
    const result = await require('../config/db').query(
      'SELECT u.id, u.is_active, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1', 
      [decoded.id]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Access denied.' });
    }

    if (!result.rows[0].is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an administrator.' });
    }

    const userRole = result.rows[0].role_name.toLowerCase();
    const validRoles = ['citizen', 'notary', 'officer', 'admin'];
    if (!validRoles.includes(userRole)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }

    req.user = { id: result.rows[0].id, role: userRole };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Access denied.' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Access denied.' });
    }
    
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());
    if (!normalizedAllowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to access this resource.' });
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };
