import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { getDatabase } from '../database/init';
import { User, UserRole, AuthPayload } from '../types';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const authRoutes = Router();

// Validation schemas
const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'power_user', 'admin').default('user')
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

// Login endpoint
authRoutes.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { username, password } = value;
  const db = getDatabase();

  // Find user
  const user = await db.get<User>(
    'SELECT * FROM users WHERE username = ? AND is_active = 1',
    [username]
  );

  if (!user) {
    logger.warn('Login attempt with invalid username', { username });
    throw createError('Invalid credentials', 401);
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    logger.warn('Login attempt with invalid password', { userId: user.id, username });
    throw createError('Invalid credentials', 401);
  }

  // Update last login
  await db.run(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
    [user.id]
  );

  // Generate JWT token
  const payload: AuthPayload = {
    userId: user.id,
    username: user.username,
    role: user.role as UserRole,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!);

  // Log successful login
  await logAudit(user.id, 'LOGIN', 'user', user.id, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.info('User logged in successfully', { userId: user.id, username });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.last_login
      }
    }
  });
}));

// Register endpoint (admin only)
authRoutes.post('/register', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  // Only admins can register new users
  if (req.user?.role !== UserRole.ADMIN) {
    throw createError('Only administrators can register new users', 403);
  }

  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { username, email, password, role } = value;
  const db = getDatabase();

  // Check if user already exists
  const existingUser = await db.get(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [username, email]
  );

  if (existingUser) {
    throw createError('Username or email already exists', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = uuidv4();

  // Create user
  await db.run(`
    INSERT INTO users (id, username, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `, [userId, username, email, passwordHash, role]);

  // Log user creation
  await logAudit(req.user!.userId, 'CREATE_USER', 'user', userId, {
    username,
    email,
    role
  });

  logger.info('New user registered', { userId, username, createdBy: req.user!.userId });

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      id: userId,
      username,
      email,
      role
    }
  });
}));

// Get current user profile
authRoutes.get('/profile', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  const user = await db.get<User>(
    'SELECT id, username, email, role, is_active, created_at, last_login FROM users WHERE id = ?',
    [req.user!.userId]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({
    success: true,
    data: user
  });
}));

// Change password
authRoutes.post('/change-password', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = changePasswordSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { currentPassword, newPassword } = value;
  const db = getDatabase();

  // Get current user
  const user = await db.get<User>(
    'SELECT * FROM users WHERE id = ?',
    [req.user!.userId]
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValidPassword) {
    throw createError('Current password is incorrect', 400);
  }

  // Hash new password
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Update password
  await db.run(
    'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newPasswordHash, user.id]
  );

  // Log password change
  await logAudit(user.id, 'CHANGE_PASSWORD', 'user', user.id, {});

  logger.info('Password changed successfully', { userId: user.id });

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout endpoint (mainly for audit logging)
authRoutes.post('/logout', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  // Log logout
  await logAudit(req.user!.userId, 'LOGOUT', 'user', req.user!.userId, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  logger.info('User logged out', { userId: req.user!.userId });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}));

// Verify token endpoint
authRoutes.get('/verify', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: {
      valid: true,
      user: req.user
    }
  });
}));