import { ApiError } from '../lib/http.js';

/**
 * Small in-memory sliding-window rate limiter for sensitive endpoints.
 * Suitable for a single API instance; deploy behind a shared store when the
 * API runs on multiple instances.
 */
export function rateLimit({
  windowMs = 60_000,
  max = 30,
  keyPrefix = 'rl',
  message = 'Too many requests. Please wait a moment and try again.',
} = {}) {
  const buckets = new Map();
  let lastCleanup = Date.now();

  const cleanup = (now) => {
    if (now - lastCleanup < windowMs) return;
    lastCleanup = now;
    for (const [key, entry] of buckets) {
      if (entry.resetAt <= now) buckets.delete(key);
    }
  };

  return (req, res, next) => {
    const now = Date.now();
    cleanup(now);

    const identity = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${identity}`;
    let entry = buckets.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(
        new ApiError(429, message, { code: 'RATE_LIMITED' }),
      );
    }

    return next();
  };
}
