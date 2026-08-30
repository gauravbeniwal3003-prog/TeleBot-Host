import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';
import { DBUser } from '../db/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'telehost_jwt_super_secure_production_secret_2026';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'moderator';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function generateToken(user: DBUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.telehost_token) {
    token = req.cookies.telehost_token;
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
    return;
  }

  const user = db.findUserById(payload.id);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User account no longer exists' });
    return;
  }

  // Check if account is suspended
  if (user.status === 'suspended' && user.role !== 'admin') {
    res.status(403).json({
      error: 'Account suspended: Your account has been temporarily suspended by an administrator. Please contact support.',
      suspended: true,
      suspendedAt: user.suspended_at,
      reason: user.suspended_reason,
    });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    // Re-verify strictly from database to ensure up-to-date role (Never rely solely on token or frontend)
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const liveUser = db.findUserById(req.user.id);
    if (!liveUser || liveUser.role !== 'admin' || liveUser.status === 'suspended') {
      db.logActivity({
        user_id: req.user.id,
        action: 'security.unauthorized_admin_access_blocked',
        target_type: 'security',
        details: {
          path: req.originalUrl,
          method: req.method,
          attemptedRole: req.user.role,
          actualRole: liveUser?.role || 'none',
          status: liveUser?.status || 'unknown',
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
      });

      res.status(403).json({ error: 'Forbidden: Superadmin authorization required. This unauthorized attempt has been logged.' });
      return;
    }

    next();
  });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.telehost_token) {
    token = req.cookies.telehost_token;
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = db.findUserById(payload.id);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }
  }

  next();
}
