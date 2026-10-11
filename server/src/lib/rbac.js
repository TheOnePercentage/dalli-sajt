import { verifyAccessToken } from './auth.js';
import { prisma } from './prisma.js';

/** Authenticate via access_token cookie or Bearer header; validates session. */
export async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers.authorization;
    const token =
      bearer && bearer.startsWith('Bearer ') ? bearer.slice(7) : req.cookies?.access_token;

    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      const expired = e?.name === 'TokenExpiredError';
      return res.status(401).json({
        error: expired ? 'Token expired' : 'Invalid token',
        code: expired ? 'token_expired' : 'token_invalid',
      });
    }

    // Session must exist and not be revoked
    const session = await prisma.session.findUnique({ where: { id: decoded.sid } });
    if (!session || session.revoked || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired', code: 'session_invalid' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        userRoles: {
          include: { role: { include: { rolePermissions: { include: { permission: true } } } } },
        },
      },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account disabled' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.userRoles.map(ur => ur.role.id),
      permissions: [
        ...new Set(
          user.userRoles.flatMap(ur => ur.role.rolePermissions.map(rp => rp.permission.id))
        ),
      ],
      sessionId: session.id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/** Require ALL listed permissions: requirePermission('products.write') */
export function requirePermission(...required) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const has = required.every(p => req.user.permissions.includes(p));
    if (!has) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'insufficient_permissions',
        required,
      });
    }
    next();
  };
}

/** Require ANY of the listed permissions */
export function requireAnyPermission(...accepted) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    const has = accepted.some(p => req.user.permissions.includes(p));
    if (!has) {
      return res
        .status(403)
        .json({ error: 'Forbidden', code: 'insufficient_permissions', required: accepted });
    }
    next();
  };
}

/** Staff check: any role except pure customer */
export function requireStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  const staffRoles = req.user.roles.filter(r => r !== 'customer');
  if (staffRoles.length === 0) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}
