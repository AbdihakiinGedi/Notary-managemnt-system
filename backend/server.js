const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('[FATAL ERROR] JWT_SECRET environment variable is missing. Check your .env file.');
  process.exit(1);
}

const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const transferRoutes = require('./routes/transferRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notaryRoutes = require('./routes/notaryRoutes');
const publicRoutes = require('./routes/publicRoutes'); // #4
const assetRoutes = require('./routes/assetRoutes'); // Universal Engine
const agreementRoutes = require('./routes/agreementRoutes');


const { traceMiddleware, errorHandler } = require('./middleware/systemMiddleware');
const { runIntegrityCheck } = require('./utils/integrityJob'); // #10
const { circuitBreakerGuard } = require('./middleware/circuitBreaker');


const { globalRateLimiter, idempotencyGuard } = require('./middleware/concurrencyMiddleware');

const app = express();

// Ensure upload directories exist (#4)
const uploadDirs = ['uploads', 'temp'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(path.join(__dirname, dir))) {
    fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
    console.log(`[BOOT] Created directory: ${dir}`);
  }
});

app.use(traceMiddleware);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(globalRateLimiter); // Protect all endpoints (#9)
app.use(circuitBreakerGuard); // 7. GLOBAL FAILURE ISOLATION MODE
app.use(express.json());
app.use(idempotencyGuard); // Automatic retry protection (#1)
app.use(morgan('combined'));
// Serve PDF agreements from /uploads/agreements (authenticated via agreementRoutes download endpoint)
// Root /uploads still restricted to images only
app.use('/uploads/agreements', express.static(path.join(__dirname, 'uploads', 'agreements')));
app.use('/uploads', (req, res, next) => {
  // Skip if already handled by /uploads/agreements above
  const ext = path.extname(req.path).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.pdf'];
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: 'Access denied. Only image files can be served publicly.' });
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Routes
const db = require('./config/db');

// --- Institutional Health Feed ---
app.get('/api/health', (req, res) => {
  return res.json({ 
    status: 'operational',
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notary', notaryRoutes);
app.use('/api/public', publicRoutes); // #4 Public Verifiability
app.use('/api/assets', assetRoutes); // # Universal Asset Engine
app.use('/api/asset-search', require('./routes/assetSearchRoutes')); // # Sovereign Search Engine
app.use('/api/history', require('./routes/historyRoutes')); // Global History System
app.use('/api/agreements', agreementRoutes);
// Centralized Error Handling
app.use(errorHandler);

const { runRecoveryWorker } = require('./utils/recoveryWorker');
const { runGlobalSnapshotJob } = require('./utils/snapshotJob');

// Background Jobs
if (process.env.ENABLE_INTEGRITY === 'true') {
  setInterval(() => {
    runIntegrityCheck().catch(console.error);
    runGlobalSnapshotJob().catch(console.error);
  }, 60 * 60 * 1000); // 1 hour

  setInterval(() => {
    runRecoveryWorker().catch(console.error);
  }, 15 * 60 * 1000); // 15 mins

  runIntegrityCheck();
  runGlobalSnapshotJob();
  runRecoveryWorker();
} else {
  console.log('[BOOT] Integrity workers manually frozen (ENABLE_INTEGRITY !== true).');
}

process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err);
});


process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION AT:', promise, 'REASON:', reason);
});

// 10. Memory Pressure Guard (#10) - TTL Cleanup for Idempotency
setInterval(async () => {
  try {
    const res = await db.query('DELETE FROM request_idempotency WHERE created_at < NOW() - INTERVAL \'24 hours\'');
    if (res.rowCount > 0) console.log(`[CLEANUP] Purged ${res.rowCount} expired idempotency records.`);
  } catch (err) {
    console.error('[CLEANUP_FAILURE]', err.message);
  }
}, 60 * 60 * 1000); // Every hour


const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });
});

// Set global io for notificationHelper to use
global.io = io;

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🏢 GOVERNMENT LAND REGISTRY SYSTEM`);
  console.log(`-----------------------------------`);
  console.log(`STATUS : Operational`);
  console.log(`PORT   : ${PORT}`);
  console.log(`SOCKET : Attached`);
  console.log(`DB     : Connected (PostgreSQL)`);
  console.log(`-----------------------------------\n`);
});
