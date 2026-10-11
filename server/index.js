import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { requireSecrets } from './src/lib/auth.js';
import { cache } from './src/lib/cache.js';
import { prisma } from './src/lib/prisma.js';
import { throttle } from './src/lib/rateLimit.js';
import { closeSocket, getIO, initSocket, SocketEvents } from './src/lib/socket.js';
import adminRouter from './src/routes/admin/index.js';
import authRouter from './src/routes/auth.js';
import checkoutRouter from './src/routes/checkout.js';
import publicRouter from './src/routes/public.js';

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer, process.env.REDIS_URL);

app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

const ALLOWED_ORIGINS = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .concat([
      'http://localhost:5173',
      'http://localhost:8000',
      'http://localhost:8001',
      'http://localhost:3000',
      'http://localhost:4173',
      'http://localhost:3001',
      'https://dalli.rs',
      'https://www.dalli.rs',
    ])
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.has(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(cookieParser());

// --- CSRF protection ---
app.use((req, res, next) => {
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) return next();
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return res
      .status(403)
      .json({ error: 'Cross-origin request blocked', code: 'csrf_origin_blocked' });
  }
  next();
});

// --- Generic API throttle ---
app.use('/api', throttle({ limit: 120, windowSec: 60, prefix: 'api' }));

// --- Request logging (structured JSON) ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path === '/api/v1/health' || req.path.startsWith('/socket.io')) return;
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
        ip: req.ip,
      })
    );
  });
  next();
});

// --- Health ---
app.get('/api/v1/health', async (req, res) => {
  const started = Date.now();
  let db = 'up';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    db = 'down';
  }
  const io = getIO();
  const socketCount = io.engine.clientsCount || 0;
  res.json({
    status: db === 'up' ? 'ok' : 'degraded',
    db,
    cache: cache.kind,
    sockets: socketCount,
    uptime: Math.round(process.uptime()),
    latencyMs: Date.now() - started,
    version: process.env.npm_package_version || '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// --- Auth (canonical + legacy alias) ---
app.use('/api/v1/auth', authRouter);
app.use('/admin/auth', authRouter); // legacy path compatibility

// --- Public storefront API ---
app.use('/api/v1', publicRouter);
app.use('/api/v1', checkoutRouter);
app.use('/api', publicRouter); // legacy /api/products, /api/search... compatibility
app.use('/api', checkoutRouter);

// --- Admin API (canonical + legacy alias) ---
app.use('/api/v1/admin', adminRouter);
app.use('/api/admin', adminRouter);

// --- Socket.io status endpoint (dev/debug only; kept out of production) ---
app.get('/api/socket/status', (req, res) => {
  if (NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  const io = getIO();
  res.json({
    connected: io.engine.clientsCount,
    rooms: [...io.sockets.adapter.rooms.keys()].slice(0, 20),
  });
});

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed', code: 'cors_blocked' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'unhandled',
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      status: err.status || 500,
      code: err.code || null,
      error: err.message,
      stack: NODE_ENV === 'production' ? undefined : err.stack,
    })
  );
  res.status(err.status || 500).json({
    error:
      NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
  });
});

// Make SocketEvents available globally for routes
global.SocketEvents = SocketEvents;

async function start() {
  requireSecrets();
  await cache.init();
  httpServer.listen(PORT, () => {
    console.log(
      `DALLI API listening on http://localhost:${PORT} (${NODE_ENV}, cache: ${cache.kind})`
    );
    console.log(`Socket.io enabled on ws://localhost:${PORT}/socket.io/`);
  });
}

process.on('SIGTERM', async () => {
  await closeSocket();
  await prisma.$disconnect();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await closeSocket();
  await prisma.$disconnect();
  process.exit(0);
});

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
