import { randomBytes } from 'crypto';
import { prisma } from './prisma.js';

/** Never throws - audit failures must not break requests */
export async function auditLog(event) {
  try {
    await prisma.auditLog.create({
      data: {
        eventId: event.eventId || randomBytes(16).toString('hex'),
        eventType: event.eventType,
        adminId: event.adminId ?? null,
        userId: event.userId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        geoCountry: event.geoCountry ?? null,
        geoCity: event.geoCity ?? null,
        deviceFingerprint: event.deviceFingerprint ?? null,
        deviceTrusted: !!event.deviceTrusted,
        mfaMethod: event.mfaMethod ?? null,
        result: event.result ?? null,
        riskScore: event.riskScore ?? 0,
        metadata: event.metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error('[audit] failed:', err.message);
  }
}

export async function loginAttempt({ email, userId, success, reason, ip, userAgent, deviceHash }) {
  try {
    await prisma.loginAttempt.create({
      data: {
        email,
        userId: userId ?? null,
        success,
        reason: reason ?? null,
        ip,
        userAgent,
        deviceHash: deviceHash ?? null,
      },
    });
  } catch (err) {
    console.error('[loginAttempt] failed:', err.message);
  }
}
