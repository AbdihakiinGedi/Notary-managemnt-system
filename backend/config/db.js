const { Pool } = require('pg');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

if (!process.env.DATABASE_URL) {
  console.error('[FATAL ERROR] DATABASE_URL environment variable is missing. Check your .env file.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Controlled pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Fail fast on connection acquisition
});

pool.on('error', (err) => {
  console.error('[DB POOL ERROR]', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  
  connect: () => pool.connect(),

  withTransaction: async (work) => {
    const TX_TIMEOUT_MS = 10000;
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      const client = await pool.connect();
      let timeoutId;
      try {
        await client.query('BEGIN');
        // 3. SET LOCAL statement_timeout (#3) - Force DB to cancel query if app times out
        await client.query(`SET LOCAL statement_timeout = '${TX_TIMEOUT_MS}ms'`);
        
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Transaction timeout')), TX_TIMEOUT_MS);
        });

        const result = await Promise.race([work(client), timeoutPromise]);
        clearTimeout(timeoutId);

        await client.query('COMMIT');
        return result;
      } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle Deadlock (40P01) or Serialization Failure (40001)
        const isRetryable = error.code === '40P01' || error.code === '40001';
        
        try {
          // If it was a timeout, the connection might be hanging. 
          // We must attempt ROLLBACK. If it fails, we destroy the client.
          await client.query('ROLLBACK');
        } catch (rbErr) {
          console.error('[ROLLBACK FAILURE]', rbErr.message);
          // Destroy the client if rollback fails to prevent zombie state
          client.release(true);
          throw error;
        }

        if (isRetryable && attempt < MAX_RETRIES - 1) {
          attempt++;
          // 8. Exponential Backoff with Jitter (#8)
          const backoff = Math.pow(2, attempt) * 100 + Math.random() * 50;
          console.warn(`[DB RETRY] Contention detected (Code: ${error.code}). Attempt ${attempt}/${MAX_RETRIES}. Backoff: ${Math.round(backoff)}ms`);
          
          client.release(); // Release current client before sleeping
          await new Promise(res => setTimeout(res, backoff));
          continue;
        }

        throw error;
      } finally {
        // Ensure client is always released (if not destroyed or already released)
        if (client && client.release && !client._released) {
          client.release();
          client._released = true; // Guard against double-release
        }
      }
    }
  }
};
