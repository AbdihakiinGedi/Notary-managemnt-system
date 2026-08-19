/**
 * 7. GLOBAL FAILURE ISOLATION MODE (CIRCUIT BREAKER)
 * If DB or system becomes unstable, enter DEGRADED MODE (read-only).
 */

const WINDOW_MS = 60 * 1000; // 1 minute
const THRESHOLD_PERCENT = 5;
const MIN_REQUESTS = 10; // need at least 10 requests to trigger

let totalRequests = 0;
let failedRequests = 0;
let isDegraded = false;
let degradedUntil = 0;

setInterval(() => {
  if (isDegraded && Date.now() > degradedUntil) {
    console.log('[CIRCUIT_BREAKER] System recovered. Exiting DEGRADED MODE.');
    isDegraded = false;
  }

  // Reset counters for the next window if not degraded
  if (!isDegraded) {
    totalRequests = 0;
    failedRequests = 0;
  }
}, WINDOW_MS);

const circuitBreakerGuard = (req, res, next) => {
  if (isDegraded) {
    if (req.method !== 'GET') {
      return res.status(503).json({ error: "System is currently in DEGRADED MODE. Read-only operations allowed." });
    }
  }

  if (req.method !== 'GET') {
    totalRequests++;
  }

  const originalSend = res.send;
  res.send = function (body) {
    if (res.statusCode >= 500 && req.method !== 'GET') {
      failedRequests++;
      if (!isDegraded && totalRequests >= MIN_REQUESTS) {
        const failureRate = (failedRequests / totalRequests) * 100;
        if (failureRate >= THRESHOLD_PERCENT) {
          console.error(`[CRITICAL_ALERT] Circuit Breaker Tripped! Failure rate: ${failureRate.toFixed(2)}%. Entering DEGRADED MODE for 1 minute.`);
          isDegraded = true;
          degradedUntil = Date.now() + WINDOW_MS;
        }
      }
    }
    originalSend.call(this, body);
  };

  next();
};

module.exports = { circuitBreakerGuard };
