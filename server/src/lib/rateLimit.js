import { cache } from './cache.js';

/**
 * Fixed-window rate limiter backed by the cache layer (Redis or memory).
 * Returns { allowed, remaining, resetAt }
 */
export async function rateLimit({ key, limit, windowSec }) {
  const now = Date.now();
  const windowIdx = Math.floor(now / (windowSec * 1000));
  const cacheKey = `rl:${key}:${windowIdx}`;
  const current = (await cache.get(cacheKey)) || 0;
  const resetAt = (windowIdx + 1) * windowSec * 1000;
  if (current >= limit) {
    return { allowed: false, remaining: 0, resetAt, current };
  }
  await cache.set(cacheKey, current + 1, windowSec);
  return { allowed: true, remaining: limit - current - 1, resetAt, current: current + 1 };
}

/**
 * Express middleware: generic API throttle.
 * skip(req) can bypass (e.g. authenticated staff).
 */
export function throttle({ limit = 120, windowSec = 60, prefix = 'api', skip } = {}) {
  return async (req, res, next) => {
    try {
      if (skip && skip(req)) return next();
      const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      const result = await rateLimit({ key: `${prefix}:${ip}`, limit, windowSec });
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
      if (!result.allowed) {
        const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
        res.setHeader('Retry-After', String(retryAfter));
        return res
          .status(429)
          .json({ error: 'Too many requests', code: 'rate_limited', retryAfter });
      }
      next();
    } catch (err) {
      console.error('[rateLimit] fallback to open:', err.message);
      next(); // fail open - never block traffic on limiter/infra failure
    }
  };
}

/**
 * Login-specific protection: count recent FAILURES per email and per IP.
 * 5 failures / 15 min for an email  -> locked
 * 20 failures / 15 min for an IP    -> throttled
 */
import { prisma } from './prisma.js';

const WINDOW_MS = 15 * 60 * 1000;

export async function loginLockStatus(email, ip) {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const [byEmail, byIp] = await Promise.all([
      prisma.loginAttempt.count({
        where: { email: email.toLowerCase(), success: false, createdAt: { gte: since } },
      }),
      prisma.loginAttempt.count({
        where: { ip, success: false, createdAt: { gte: since } },
      }),
    ]);
    if (byEmail >= 5)
      return { locked: true, reason: 'email_locked', retryAfter: 900, byEmail, byIp };
    if (byIp >= 20) return { locked: true, reason: 'ip_throttled', retryAfter: 900, byEmail, byIp };
    return { locked: false, byEmail, byIp };
  } catch (err) {
    console.error('[rateLimit] lock check failed (fail open):', err.message);
    return { locked: false, byEmail: 0, byIp: 0 };
  }
}
