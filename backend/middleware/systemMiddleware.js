const { v4: uuidv4 } = require('uuid');

const traceMiddleware = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
};

const safeExecute = (fn, actionName = 'ANONYMOUS_ACTION') => {
  const SIDE_EFFECT_TIMEOUT = 5000;
  return async (...args) => {
    let timeoutId;
    // Attempt to extract context if available (assuming req is first arg or attached)
    const req = args.find(a => a && a.id); 
    const context = {
      action: actionName,
      request_id: req ? req.id : 'N/A',
      user_id: (req && req.user) ? req.user.id : 'N/A',
      timestamp: new Date().toISOString()
    };

    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Timeout')), SIDE_EFFECT_TIMEOUT);
      });
      await Promise.race([fn(...args), timeoutPromise]);
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error(`[SIDE_EFFECT_FAILURE]`, { ...context, error: err.message });
    }
  };
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Internal Audit Logging
  console.error(`[CRITICAL] Request ${req.id || 'N/A'}:`, err.stack || err.message);

  let statusCode = 500;
  let errorResponse = "System unavailable";

  if (err.message && (err.message.includes('Access denied') || err.message.includes('Authority Verification Failed'))) {
    statusCode = 403;
    errorResponse = "Access denied";
  } else if (err.message && (err.message.includes('Conflict detected') || err.message.includes('Duplicate Protection'))) {
    statusCode = 409;
    errorResponse = "Conflict detected";
  } else if (err.status === 400 || err.name === 'ZodError') {
    statusCode = 400;
    errorResponse = "Operation failed";
  } else if (err.status) {
    statusCode = err.status;
    errorResponse = err.status === 401 ? "Access denied" : "Operation failed";
  }

  // Admin Alerts Dispatch Hook
  try {
    const { notifyService } = require('../config/notificationHelper');
    if (statusCode === 500) {
      notifyService({
        event_type: 'SERVER_ERROR',
        payload_json: { message: `Internal server error on request ${req.id || 'N/A'}: ${err.message}` },
        category: 'security'
      }).catch(console.error);
    } else if (statusCode === 409 || err.message?.includes('duplicate key') || err.message?.includes('unique constraint') || err.message?.includes('Duplicate')) {
      notifyService({
        event_type: 'DUPLICATE_OWNERSHIP_ATTEMPT',
        payload_json: { message: `Duplicate ownership attempt or conflict detected: ${err.message}` },
        category: 'security'
      }).catch(console.error);
    }
  } catch (notifyErr) {
    console.error('Failed to notify error handler alert:', notifyErr.message);
  }

  return res.status(statusCode).json({
    error: errorResponse,
    trace: req.id
  });
};

module.exports = { traceMiddleware, errorHandler, safeExecute };
