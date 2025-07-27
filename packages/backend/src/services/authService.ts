import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { User, AuthPayload } from '../types';
import { logger } from '../utils/logger';
import { logAudit } from './auditService';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenData {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  ipAddress: string;
  userAgent: string;
  isRevoked: boolean;
}

export interface LoginAttempt {
  id: string;
  username: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
  timestamp: Date;
}

export interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  accessTokenExpiryMinutes: number;
  refreshTokenExpiryDays: number;
  passwordMinLength: number;
  passwordComplexityRequired: boolean;
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // Longer-lived refresh tokens
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 30;
  private static readonly BCRYPT_ROUNDS = 12;

  /**
   * Enhanced login with security features
   */
  static async login(
    username: string, 
    password: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<{ user: User; tokens: TokenPair } | null> {
    const db = getDatabase();
    
    try {
      // Check for account lockout
      const isLockedOut = await this.isAccountLockedOut(username, ipAddress);
      if (isLockedOut) {
        await this.logLoginAttempt(username, ipAddress, userAgent, false, 'Account locked out');
        throw new Error('Account temporarily locked due to too many failed login attempts');
      }

      // Find user
      const user = await db.get<User>(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username]
      );

      if (!user) {
        await this.logLoginAttempt(username, ipAddress, userAgent, false, 'User not found');
        await this.incrementFailedAttempts(username, ipAddress);
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        await this.logLoginAttempt(username, ipAddress, userAgent, false, 'Invalid password');
        await this.incrementFailedAttempts(username, ipAddress);
        return null;
      }

      // Clear failed attempts on successful login
      await this.clearFailedAttempts(username, ipAddress);

      // Generate token pair
      const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

      // Update last login
      await db.run(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Log successful login
      await this.logLoginAttempt(username, ipAddress, userAgent, true);
      await logAudit(user.id, 'user_login', 'auth', { ipAddress, userAgent });

      logger.info('Successful login', { 
        userId: user.id, 
        username: user.username,
        ipAddress,
        userAgent: userAgent.substring(0, 100)
      });

      return { user, tokens };
    } catch (error) {
      logger.error('Login error', { error, username, ipAddress });
      throw error;
    }
  }

  /**
   * Generate access and refresh token pair
   */
  static async generateTokenPair(
    user: User, 
    ipAddress: string, 
    userAgent: string
  ): Promise<TokenPair> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    // Create access token payload
    const accessTokenPayload: AuthPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions || [],
      iat: Math.floor(Date.now() / 1000),
      tokenType: 'access'
    };

    // Generate access token (short-lived)
    const accessToken = jwt.sign(accessTokenPayload, jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'scriptflow',
      audience: 'scriptflow-api',
      jwtid: uuidv4()
    });

    // Generate refresh token
    const refreshToken = await this.generateRefreshToken(user.id, ipAddress, userAgent);

    return {
      accessToken,
      refreshToken: refreshToken.token,
      expiresIn: 15 * 60, // 15 minutes in seconds
      tokenType: 'Bearer'
    };
  }

  /**
   * Generate secure refresh token
   */
  static async generateRefreshToken(
    userId: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<RefreshTokenData> {
    const db = getDatabase();
    
    // Generate cryptographically secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const refreshTokenData: RefreshTokenData = {
      id: tokenId,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
      ipAddress,
      userAgent,
      isRevoked: false
    };

    // Store refresh token in database
    await db.run(`
      INSERT INTO refresh_tokens (
        id, user_id, token, expires_at, created_at, 
        ip_address, user_agent, is_revoked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tokenId, userId, token, expiresAt.toISOString(), 
      new Date().toISOString(), ipAddress, userAgent, 0
    ]);

    // Clean up old refresh tokens for this user (keep only 5 most recent)
    await this.cleanupOldRefreshTokens(userId);

    return refreshTokenData;
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(
    refreshToken: string, 
    ipAddress: string, 
    userAgent: string
  ): Promise<TokenPair | null> {
    const db = getDatabase();

    try {
      // Find and validate refresh token
      const tokenData = await db.get<RefreshTokenData>(`
        SELECT rt.*, u.* 
        FROM refresh_tokens rt
        JOIN users u ON rt.user_id = u.id
        WHERE rt.token = ? AND rt.is_revoked = 0 AND rt.expires_at > datetime('now')
      `, [refreshToken]);

      if (!tokenData) {
        logger.warn('Invalid refresh token used', { ipAddress, userAgent });
        return null;
      }

      // Update last used timestamp
      await db.run(
        'UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?',
        [tokenData.id]
      );

      // Create user object from token data
      const user: User = {
        id: tokenData.userId,
        username: tokenData.username,
        email: tokenData.email,
        role: tokenData.role,
        permissions: tokenData.permissions ? JSON.parse(tokenData.permissions) : [],
        is_active: tokenData.is_active,
        created_at: tokenData.created_at,
        updated_at: tokenData.updated_at,
        last_login: tokenData.last_login,
        password_hash: tokenData.password_hash
      };

      // Generate new token pair
      const tokens = await this.generateTokenPair(user, ipAddress, userAgent);

      // Optionally revoke the used refresh token (for added security)
      // await this.revokeRefreshToken(refreshToken);

      logger.info('Token refreshed successfully', { 
        userId: user.id, 
        ipAddress,
        userAgent: userAgent.substring(0, 100)
      });

      return tokens;
    } catch (error) {
      logger.error('Token refresh error', { error, ipAddress });
      throw error;
    }
  }

  /**
   * Verify and decode access token
   */
  static async verifyAccessToken(token: string): Promise<AuthPayload | null> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      const decoded = jwt.verify(token, jwtSecret, {
        issuer: 'scriptflow',
        audience: 'scriptflow-api'
      }) as AuthPayload;

      // Additional validation
      if (decoded.tokenType !== 'access') {
        logger.warn('Invalid token type', { tokenType: decoded.tokenType });
        return null;
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('JWT verification failed', { error: error.message });
      } else {
        logger.error('Token verification error', { error });
      }
      return null;
    }
  }

  /**
   * Revoke refresh token
   */
  static async revokeRefreshToken(token: string): Promise<boolean> {
    const db = getDatabase();

    try {
      const result = await db.run(
        'UPDATE refresh_tokens SET is_revoked = 1 WHERE token = ?',
        [token]
      );

      return result.changes > 0;
    } catch (error) {
      logger.error('Error revoking refresh token', { error });
      return false;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.run(
        'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ?',
        [userId]
      );

      logger.info('All tokens revoked for user', { userId });
    } catch (error) {
      logger.error('Error revoking user tokens', { error, userId });
      throw error;
    }
  }

  /**
   * Check if account is locked out
   */
  private static async isAccountLockedOut(username: string, ipAddress: string): Promise<boolean> {
    const db = getDatabase();
    const cutoffTime = new Date(Date.now() - this.LOCKOUT_DURATION_MINUTES * 60 * 1000);

    const attempts = await db.get<{ count: number }>(`
      SELECT COUNT(*) as count 
      FROM login_attempts 
      WHERE (username = ? OR ip_address = ?) 
        AND success = 0 
        AND timestamp > ?
    `, [username, ipAddress, cutoffTime.toISOString()]);

    return (attempts?.count || 0) >= this.MAX_LOGIN_ATTEMPTS;
  }

  /**
   * Increment failed login attempts
   */
  private static async incrementFailedAttempts(username: string, ipAddress: string): Promise<void> {
    // Implementation would track failed attempts per username and IP
    logger.warn('Failed login attempt', { username, ipAddress });
  }

  /**
   * Clear failed login attempts
   */
  private static async clearFailedAttempts(username: string, ipAddress: string): Promise<void> {
    const db = getDatabase();
    
    try {
      await db.run(`
        DELETE FROM login_attempts 
        WHERE (username = ? OR ip_address = ?) AND success = 0
      `, [username, ipAddress]);
    } catch (error) {
      logger.error('Error clearing failed attempts', { error });
    }
  }

  /**
   * Log login attempt
   */
  private static async logLoginAttempt(
    username: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    const db = getDatabase();

    try {
      await db.run(`
        INSERT INTO login_attempts (
          id, username, ip_address, user_agent, success, failure_reason, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        username,
        ipAddress,
        userAgent,
        success ? 1 : 0,
        failureReason || null,
        new Date().toISOString()
      ]);
    } catch (error) {
      logger.error('Error logging login attempt', { error });
    }
  }

  /**
   * Clean up old refresh tokens
   */
  private static async cleanupOldRefreshTokens(userId: string): Promise<void> {
    const db = getDatabase();

    try {
      // Keep only the 5 most recent refresh tokens per user
      await db.run(`
        DELETE FROM refresh_tokens 
        WHERE user_id = ? 
          AND id NOT IN (
            SELECT id FROM refresh_tokens 
            WHERE user_id = ? 
            ORDER BY created_at DESC 
            LIMIT 5
          )
      `, [userId, userId]);

      // Also clean up expired tokens
      await db.run(`
        DELETE FROM refresh_tokens 
        WHERE expires_at < datetime('now') OR is_revoked = 1
      `);
    } catch (error) {
      logger.error('Error cleaning up refresh tokens', { error });
    }
  }

  /**
   * Hash password with secure settings
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push('Password must contain at least one special character (@$!%*?&)');
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{2,}/, // Repeated characters
      /123|abc|qwe|asd|zxc/i, // Sequential patterns
      /password|admin|user|login/i // Common words
    ];

    if (commonPatterns.some(pattern => pattern.test(password))) {
      errors.push('Password contains common patterns or words');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate secure session ID
   */
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<RefreshTokenData[]> {
    const db = getDatabase();

    try {
      const sessions = await db.all<RefreshTokenData[]>(`
        SELECT id, user_id, created_at, last_used_at, ip_address, user_agent, is_revoked
        FROM refresh_tokens 
        WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')
        ORDER BY last_used_at DESC
      `, [userId]);

      return sessions || [];
    } catch (error) {
      logger.error('Error fetching user sessions', { error, userId });
      return [];
    }
  }

  /**
   * Terminate specific session
   */
  static async terminateSession(userId: string, sessionId: string): Promise<boolean> {
    const db = getDatabase();

    try {
      const result = await db.run(
        'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND id = ?',
        [userId, sessionId]
      );

      return result.changes > 0;
    } catch (error) {
      logger.error('Error terminating session', { error, userId, sessionId });
      return false;
    }
  }
}