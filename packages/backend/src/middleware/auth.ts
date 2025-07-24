import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload, UserRole } from '../types';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    const decoded = jwt.verify(token, secret) as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid token attempt', { token: token.substring(0, 20) + '...' });
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid or expired token' 
    });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Insufficient permissions', { 
        userId: req.user.userId, 
        role: req.user.role, 
        requiredRoles: roles 
      });
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole([UserRole.ADMIN])(req, res, next);
}

export function requireAdminOrPowerUser(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole([UserRole.ADMIN, UserRole.POWER_USER])(req, res, next);
}