import { randomBytes } from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { auditLog, loginAttempt } from '../lib/audit.js';
import {
  JWT_SECRET,
  clearAuthCookies,
  deviceHash,
  dummyPasswordCheck,
  hashPassword,
  hashToken,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { loginLockStatus } from '../lib/rateLimit.js';
import { requireAuth } from '../lib/rbac.js';

const router = Router();

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function clientIp(req) {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
}

async function issueSession(req, res, user, { deviceFingerprint, deviceName, rememberDevice }) {
  const ip = clientIp(req);
  const userAgent = req.headers['user-agent'] || 'unknown';
  const fp = deviceFingerprint || `auto-${randomBytes(16).toString('hex')}`;

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      deviceFingerprint: fp,
      deviceName: deviceName || 'Unknown Device',
      ip,
      userAgent,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  const familyId = session.id; // one refresh family per session -> reuse detection
  const refreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      familyId,
      userId: user.id,
      deviceFingerprint: fp,
      deviceName: deviceName || 'Unknown Device',
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  if (rememberDevice && deviceFingerprint) {
    await prisma.trustedDevice.upsert({
      where: { userId_deviceHash: { userId: user.id, deviceHash: deviceHash(fp) } },
      update: { expiresAt: new Date(Date.now() + REFRESH_TTL_MS), lastUsed: new Date() },
      create: {
        userId: user.id,
        deviceHash: deviceHash(fp),
        deviceName: deviceName || 'Unknown Device',
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
  }

  // Load roles + permissions for the access token
  const userWithRoles = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      userRoles: {
        include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
      },
    },
  });
  const roles = userWithRoles.userRoles.map(ur => ur.role.id);
  const permissions = [
    ...new Set(
      userWithRoles.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.id))
    ),
  ];

  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    roles,
    permissions,
    sessionId: session.id,
  });
  const csrfToken = randomBytes(32).toString('hex');
  setAuthCookies(res, { accessToken, refreshToken, csrfToken });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { session, roles, permissions, csrfToken };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    locale: user.locale,
    currency: user.currency,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
  };
}

// --- Register (customer) ---
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (String(password).length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
      },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: 'customer' } });
    // default wishlist
    await prisma.wishlist.create({ data: { userId: user.id, name: 'Moja lista' } });

    const { roles, permissions } = await issueSession(req, res, user, {
      deviceFingerprint: req.body?.deviceFingerprint,
      deviceName: req.body?.deviceName,
    });
    await auditLog({
      eventType: 'USER_REGISTERED',
      userId: user.id,
      ip: clientIp(req),
      userAgent: req.headers['user-agent'],
      result: 'success',
    });

    res.status(201).json({ user: publicUser(user), roles, permissions });
  } catch (err) {
    next(err);
  }
});

// --- Login ---
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberDevice, deviceFingerprint, deviceName } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const ip = clientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';

    // STEP 13: lockout / throttle
    const lock = await loginLockStatus(email, ip);
    if (lock.locked) {
      await loginAttempt({ email, success: false, reason: lock.reason, ip, userAgent });
      res.setHeader('Retry-After', String(lock.retryAfter));
      return res.status(423).json({
        error:
          lock.reason === 'ip_throttled'
            ? 'Too many failed attempts from this network'
            : 'Account temporarily locked due to failed attempts',
        code: lock.reason,
        retryAfter: lock.retryAfter,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    let valid = false;
    if (user) {
      valid = await verifyPassword(password, user.passwordHash);
    } else {
      await dummyPasswordCheck(password); // timing equalization
    }

    if (!user || !valid || !user.isActive) {
      await loginAttempt({
        email,
        userId: user?.id,
        success: false,
        reason: !user ? 'no_user' : !user.isActive ? 'inactive' : 'bad_password',
        ip,
        userAgent,
      });
      await auditLog({
        eventType: 'LOGIN_FAILED',
        userId: user?.id,
        ip,
        userAgent,
        result: 'failed',
        riskScore: 60,
        metadata: { reason: !user ? 'no_user' : !user.isActive ? 'inactive' : 'bad_password' },
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { roles, permissions } = await issueSession(req, res, user, {
      deviceFingerprint,
      deviceName,
      rememberDevice,
    });

    await loginAttempt({
      email,
      userId: user.id,
      success: true,
      reason: 'password',
      ip,
      userAgent,
    });
    await auditLog({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      ip,
      userAgent,
      deviceFingerprint,
      deviceTrusted: !!rememberDevice,
      mfaMethod: 'password',
      result: 'success',
      riskScore: 0,
      metadata: { deviceName },
    });

    res.json({ user: publicUser(user), roles, permissions });
  } catch (err) {
    next(err);
  }
});

// --- Refresh (rotation + reuse detection) ---
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokenHash = hashToken(token);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      // Unknown token - possible theft attempt
      await auditLog({
        eventType: 'REFRESH_REUSE_DETECTED',
        userId: decoded.sub,
        ip: clientIp(req),
        result: 'failed',
        riskScore: 90,
      });
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (stored.revoked) {
      // REUSE DETECTION: revoked token presented -> revoke entire family
      await prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId },
        data: { revoked: true, revokedAt: new Date() },
      });
      await prisma.session.updateMany({
        where: { id: decoded.sid },
        data: { revoked: true, revokedAt: new Date() },
      });
      await auditLog({
        eventType: 'REFRESH_REUSE_DETECTED',
        userId: stored.userId,
        ip: clientIp(req),
        result: 'failed',
        riskScore: 100,
        metadata: { familyId: stored.familyId },
      });
      clearAuthCookies(res);
      return res
        .status(401)
        .json({ error: 'Refresh token reuse detected - session revoked', code: 'reuse_detected' });
    }

    if (stored.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }

    // Device binding
    const reqFp = req.body?.deviceFingerprint;
    if (reqFp && stored.deviceFingerprint !== reqFp) {
      await auditLog({
        eventType: 'REFRESH_DEVICE_MISMATCH',
        userId: stored.userId,
        ip: clientIp(req),
        result: 'failed',
        riskScore: 80,
      });
      return res.status(401).json({ error: 'Device mismatch' });
    }

    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account disabled' });

    // Session must still be valid
    const session = await prisma.session.findUnique({ where: { id: decoded.sid } });
    if (!session || session.revoked || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    // Rotate: revoke old, issue new in same family
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true, revokedAt: new Date() },
    });

    const newRefresh = signRefreshToken({ userId: user.id, sessionId: decoded.sid });
    await prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(newRefresh),
        familyId: stored.familyId,
        userId: user.id,
        deviceFingerprint: stored.deviceFingerprint,
        deviceName: stored.deviceName,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    await prisma.session.update({
      where: { id: decoded.sid },
      data: { updatedAt: new Date() }, // touch session activity
    });

    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });
    const roles = userWithRoles.userRoles.map(ur => ur.role.id);
    const permissions = [
      ...new Set(
        userWithRoles.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.id))
      ),
    ];

    const accessToken = signAccessToken({
      userId: user.id,
      email: user.email,
      roles,
      permissions,
      sessionId: decoded.sid,
    });
    const csrfToken = randomBytes(32).toString('hex');
    setAuthCookies(res, { accessToken, refreshToken: newRefresh, csrfToken });

    res.json({ success: true, roles, permissions, csrfToken });
  } catch (err) {
    next(err);
  }
});

// --- Logout ---
router.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      const tokenHash = hashToken(token);
      const stored = await prisma.refreshToken
        .findUnique({ where: { tokenHash } })
        .catch(() => null);
      if (stored) {
        // familyId === sessionId (one family per session)
        await prisma.refreshToken.updateMany({
          where: { familyId: stored.familyId },
          data: { revoked: true, revokedAt: new Date() },
        });
        await prisma.session.updateMany({
          where: { id: stored.familyId, userId: stored.userId },
          data: { revoked: true, revokedAt: new Date() },
        });
      }
    }
    // also revoke session from access token if present
    const access = req.cookies?.access_token;
    if (access) {
      try {
        const decoded = jwt.verify(access, JWT_SECRET);
        await prisma.session.updateMany({
          where: { id: decoded.sid },
          data: { revoked: true, revokedAt: new Date() },
        });
      } catch {
        /* already invalid */
      }
    }
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await prisma.session.updateMany({
      where: { userId: req.user.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    await auditLog({
      eventType: 'LOGOUT_ALL',
      userId: req.user.id,
      ip: clientIp(req),
      result: 'success',
    });
    clearAuthCookies(res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Current user ---
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  res.json({
    user: publicUser(user),
    roles: req.user.roles,
    permissions: req.user.permissions,
    sessionId: req.user.sessionId,
  });
});

// --- Sessions management ---
router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id, revoked: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceName: true,
        deviceFingerprint: true,
        ip: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    res.json({ sessions, currentSessionId: req.user.sessionId });
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const session = await prisma.session.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    if (session.count === 0) return res.status(404).json({ error: 'Session not found' });
    await prisma.refreshToken.updateMany({
      where: { familyId: req.params.id },
      data: { revoked: true, revokedAt: new Date() },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- Trusted devices ---
router.get('/devices', requireAuth, async (req, res, next) => {
  try {
    const devices = await prisma.trustedDevice.findMany({
      where: { userId: req.user.id, expiresAt: { gt: new Date() } },
      select: { id: true, deviceName: true, trustedAt: true, lastUsed: true, expiresAt: true },
    });
    res.json({ devices });
  } catch (err) {
    next(err);
  }
});

router.delete('/devices/:id', requireAuth, async (req, res, next) => {
  try {
    const r = await prisma.trustedDevice.deleteMany({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (r.count === 0) return res.status(404).json({ error: 'Device not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// --- STEP 5: WebAuthn/Passkey surface (architecture-ready) ---
router.get('/webauthn/credentials', requireAuth, async (req, res, next) => {
  try {
    const credentials = await prisma.webAuthnCredential.findMany({
      where: { userId: req.user.id },
      select: {
        id: true,
        credentialId: true,
        label: true,
        deviceType: true,
        backedUp: true,
        transports: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
    res.json({ credentials });
  } catch (err) {
    next(err);
  }
});

router.post('/webauthn/register/options', requireAuth, (req, res) => {
  res
    .status(501)
    .json({ error: 'WebAuthn registration not enabled yet', code: 'webauthn_not_enabled' });
});
router.post('/webauthn/login/options', (req, res) => {
  res.status(501).json({ error: 'WebAuthn login not enabled yet', code: 'webauthn_not_enabled' });
});

export default router;
