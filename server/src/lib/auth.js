import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma.js';

const ACCESS_TTL = '15m';
const ACCESS_TTL_MS = 15 * 60 * 1000;
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// Secrets MUST come from the environment. No fallback defaults exist on purpose:
// a server started without them refuses to run (the old hardcoded dev fallbacks
// were removed as a security hardening step).
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function requireSecrets() {
  const missing = [];
  if (!JWT_SECRET) missing.push('JWT_SECRET');
  if (!JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (missing.length) {
    throw new Error(
      `Missing required environment secret(s): ${missing.join(', ')} — server refuses to start without them`
    );
  }
}

function signingSecret() {
  if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets are not configured — refusing to sign tokens');
  }
  return { access: JWT_SECRET, refresh: JWT_REFRESH_SECRET };
}

const isProd = process.env.NODE_ENV === 'production';

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** Dummy compare for timing equalization when user does not exist */
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', 12);
export function dummyPasswordCheck(password) {
  return bcrypt.compare(password, DUMMY_HASH);
}

export function signAccessToken({ userId, email, roles, permissions, sessionId }) {
  return jwt.sign(
    { sub: userId, email, roles, perms: permissions, sid: sessionId },
    signingSecret().access,
    {
      expiresIn: ACCESS_TTL,
    }
  );
}

export function signRefreshToken({ userId, sessionId }) {
  return jwt.sign(
    { sub: userId, sid: sessionId, type: 'refresh', jti: randomUUID() },
    signingSecret().refresh,
    { expiresIn: '30d' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, signingSecret().access);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, signingSecret().refresh);
}

export function setAuthCookies(res, { accessToken, refreshToken, csrfToken }) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: ACCESS_TTL_MS,
    path: '/',
  });
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
    path: '/', // mounted at /api/v1/auth/refresh (+ legacy alias)
  });
  res.cookie('csrf_token', csrfToken, {
    httpOnly: false, // readable by frontend for double-submit header
    secure: isProd,
    sameSite: 'strict',
    maxAge: REFRESH_TTL_MS,
    path: '/',
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.clearCookie('csrf_token', { path: '/' });
}

export function newDeviceFingerprint() {
  return `auto-${randomBytes(16).toString('hex')}`;
}

export function deviceHash(fingerprint) {
  return createHash('sha256').update(String(fingerprint)).digest('hex');
}

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Load user with roles + permission ids */
export async function loadUserPermissions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: { include: { rolePermissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (!user) return null;
  const roles = user.userRoles.map(ur => ur.role.id);
  const permissions = [
    ...new Set(user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.id))),
  ];
  return { user, roles, permissions };
}
