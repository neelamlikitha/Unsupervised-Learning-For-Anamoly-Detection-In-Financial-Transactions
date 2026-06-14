import { env } from '../config/env.js';

const store = new Map();

function getKey(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

export function rateLimitMiddleware(req, res, next) {
  const key = getKey(req);
  const now = Date.now();
  const { windowMs, max } = env.rateLimit;

  if (!store.has(key)) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }

  const entry = store.get(key);
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return next();
  }

  entry.count += 1;
  if (entry.count > max) {
    return res.status(429).json({ message: 'Too many requests. Try again later.' });
  }
  next();
}
