import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import env from './config/env.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import uploadsRouter from './routes/uploads.js';
import heroRouter from './routes/hero.js';
import ordersRouter from './routes/orders.js';
import couponsRouter from './routes/coupons.js';
import paymentsRouter, { handleRazorpayWebhook, handleStripeWebhook } from './routes/payments.js';
import meRouter from './routes/me.js';
import adminRouter from './routes/admin.js';
import { authenticate, requireAdmin } from './middleware/auth.js';
import { ensureDatabaseConnection, isDatabaseConnected } from './config/database.js';
import { checkDatabase } from './lib/db-health.js';
import { toApiError } from './lib/db-errors.js';
import { ApiError } from './lib/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, '..', 'dist');

const app = express();
app.disable('x-powered-by');
// Vercel terminates TLS at its edge; trust its forwarded client IP so the
// rate limiter does not treat every visitor as the same proxy address.
if (process.env.VERCEL) app.set('trust proxy', 1);

const LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

function corsOrigin(origin, callback) {
  if (!origin || env.CORS_ORIGIN === '*') return callback(null, true);
  if (env.CORS_ORIGIN.includes(origin)) return callback(null, true);
  // Vite increments the port when 5173 is busy; allow any local dev port.
  if (!env.isProduction && LOCAL_ORIGIN_RE.test(origin)) return callback(null, true);
  return callback(null, false);
}

app.use(cors({ origin: corsOrigin, credentials: true }));

// Serverless functions have no startup hook, so open the shared Mongoose
// connection on the first API request and reuse it for warm invocations.
// While Atlas is unreachable the request fails fast with a 503 instead of
// waiting for the driver's server-selection timeout on every call.
app.use('/api', async (req, res, next) => {
  if (req.path === '/health' || req.path === '/health/database') return next();
  if (isDatabaseConnected()) return next();

  try {
    await ensureDatabaseConnection();
    next();
  } catch {
    res.status(503).json({
      error: 'Database is temporarily unavailable. Please try again in a moment.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }
});

// Razorpay signs the raw request body, so this route must run before JSON parsing.
app.post(
  '/api/payments/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook,
);

// Stripe also verifies the raw request body signature, so it must be mounted
// before express.json(). The handler writes only after signature verification.
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook,
);

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  // On a cold serverless instance this is often the first request, so attempt
  // the shared connection before reporting status.
  await ensureDatabaseConnection().catch(() => {});
  const database = await checkDatabase();
  res.status(database.connected ? 200 : 503).json({
    status: database.connected ? 'ok' : 'degraded',
    database,
  });
});

app.get('/api/health/database', async (_req, res) => {
  await ensureDatabaseConnection().catch(() => {});
  const database = await checkDatabase();
  res.status(database.connected ? 200 : 503).json({ database });
});

app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/hero', heroRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/me', meRouter);
app.use('/api/admin', authenticate, requireAdmin, adminRouter);

app.use('/uploads', express.static(join(__dirname, 'uploads'), { maxAge: '7d' }));

app.use('/api', (_req, _res, next) => next(new ApiError(404, 'API route not found.')));

if (existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  const apiError = toApiError(error);
  if (apiError.status >= 500) {
    console.error(`[api] ${apiError.status} ${apiError.code || 'ERROR'} (${error.name || 'Error'})`);
  }
  if (res.headersSent) return;
  res.status(apiError.status).json({
    error: apiError.message,
    code: apiError.code || null,
    errors: apiError.errors || undefined,
  });
});

export default app;
