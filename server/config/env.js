import dotenv from 'dotenv';

// The project keeps one .env at the repository root (also used by Vite).
// server/.env is accepted as a backend-only fallback and never overrides root.
dotenv.config();
dotenv.config({ path: 'server/.env' });

const read = (name) => {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
};

const readBoolean = (name, fallback = false) => {
  const value = read(name).toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
};

const required = (name) => {
  const value = read(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const NODE_ENV = read('NODE_ENV') || 'development';

function parseCorsOrigins(value) {
  if (!value || value === '*') return '*';
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Reads and validates server configuration once at process start. Secrets are
 * never logged by this module.
 */
export function loadEnv() {
  const jwtSecret = required('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  // Accept both the original MONGODB_URI and the Stripe-guide MONGO_URI name.
  const mongoUri = read('MONGODB_URI') || read('MONGO_URI');
  if (!mongoUri) throw new Error('Missing required environment variable: MONGODB_URI (or MONGO_URI)');

  // On Vercel, fall back to the deployment's own HTTPS origin so Stripe
  // redirects and password-reset links point at the live site when
  // PUBLIC_APP_URL/FRONTEND_URL are not configured.
  const vercelHosts = [
    read('VERCEL_PROJECT_PRODUCTION_URL'),
    read('VERCEL_BRANCH_URL'),
    read('VERCEL_URL'),
  ]
    .filter(Boolean)
    .map((host) => `https://${host.replace(/^https?:\/\//i, '').replace(/\/$/, '')}`);
  const configuredAppUrl = (read('FRONTEND_URL') || read('PUBLIC_APP_URL') || '').replace(
    /\/$/,
    '',
  );
  // A localhost value copied from .env must not leak into a Vercel deployment.
  const configuredIsLocalhost =
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(configuredAppUrl);
  const preferredAppUrl =
    configuredAppUrl && !(process.env.VERCEL && configuredIsLocalhost)
      ? configuredAppUrl
      : vercelHosts[0];
  const publicAppUrl = (
    preferredAppUrl ||
    configuredAppUrl ||
    'http://localhost:5174'
  ).replace(/\/$/, '');

  // An explicit CORS_ORIGIN (including "*") is honoured. When it is omitted,
  // default to the public app origin instead of silently allowing every origin.
  const corsOrigin = read('CORS_ORIGIN')
    ? parseCorsOrigins(read('CORS_ORIGIN'))
    : [publicAppUrl];
  if (Array.isArray(corsOrigin)) {
    // Always allow this deployment's own production/preview origins. These are
    // Vercel-provided values, never user input, so this does not broaden CORS
    // to arbitrary sites.
    for (const origin of [publicAppUrl, ...vercelHosts]) {
      if (!corsOrigin.includes(origin)) corsOrigin.push(origin);
    }
  }

  const env = {
    NODE_ENV,
    isProduction: NODE_ENV === 'production',
    PORT: Number(read('PORT')) || 4000,
    CORS_ORIGIN: corsOrigin,
    PUBLIC_APP_URL: publicAppUrl,
    FRONTEND_URL: publicAppUrl.replace(/\/$/, ''),

    MONGODB_URI: mongoUri,
    DB_NAME: read('DB_NAME') || 'jh_soaps',

    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: read('JWT_EXPIRES_IN') || '7d',
    JWT_ISSUER: read('JWT_ISSUER') || 'jh-soaps',
    JWT_AUDIENCE: read('JWT_AUDIENCE') || 'jh-web',
    COOKIE_NAME: read('COOKIE_NAME') || 'jh_session',
    COOKIE_SECURE: read('COOKIE_SECURE')
      ? read('COOKIE_SECURE') === 'true'
      : NODE_ENV === 'production',

    ADMIN_ROLE: read('ADMIN_ROLE') || 'admin',
    ADMIN_EMAIL: read('ADMIN_EMAIL') || '',
    ADMIN_PASSWORD: read('ADMIN_PASSWORD') || '',

    RAZORPAY_KEY_ID: read('RAZORPAY_KEY_ID') || '',
    RAZORPAY_KEY_SECRET: read('RAZORPAY_KEY_SECRET') || '',
    RAZORPAY_WEBHOOK_SECRET: read('RAZORPAY_WEBHOOK_SECRET') || '',

    STRIPE_SECRET_KEY: read('STRIPE_SECRET_KEY') || '',
    STRIPE_WEBHOOK_SECRET: read('STRIPE_WEBHOOK_SECRET') || '',
    STRIPE_ENABLE_UPI: readBoolean('STRIPE_ENABLE_UPI', false),
    // Optional explicit list, e.g. "card" or "card,upi". When empty, the list
    // is derived from STRIPE_ENABLE_UPI and never assumes UPI is available.
    STRIPE_PAYMENT_METHODS: read('STRIPE_PAYMENT_METHODS') || '',
    STRIPE_CURRENCY: (read('STRIPE_CURRENCY') || 'inr').toLowerCase(),
    STRIPE_SESSION_TTL_MINUTES: Math.min(
      1440,
      Math.max(30, Number(read('STRIPE_SESSION_TTL_MINUTES')) || 30),
    ),

    RESEND_API_KEY: read('RESEND_API_KEY') || '',
    AUTH_FROM_EMAIL: read('AUTH_FROM_EMAIL') || 'no-reply@jhsoaps.com',

    TWILIO_ACCOUNT_SID: read('TWILIO_ACCOUNT_SID') || '',
    TWILIO_AUTH_TOKEN: read('TWILIO_AUTH_TOKEN') || '',
    TWILIO_FROM_NUMBER: read('TWILIO_FROM_NUMBER') || '',
  };

  if (!/^mongodb(?:\+srv)?:\/\//i.test(env.MONGODB_URI)) {
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://.');
  }

  return env;
}

export const env = loadEnv();
export default env;
