import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { createError } from './errorHandler';

// Rate limiting configurations
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
      });
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Authentication rate limiter - stricter for login attempts
export const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts per window
  'Too many authentication attempts, please try again in 15 minutes'
);

// API rate limiter - general API usage
export const apiRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 requests per minute
  'API rate limit exceeded'
);

// Script execution rate limiter - more restrictive
export const executionRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 executions per minute
  'Script execution rate limit exceeded'
);

// Enhanced helmet configuration for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for WebSocket connections
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Input sanitization middleware
export class InputSanitizer {
  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*>/gi,
    /<link\b[^<]*>/gi,
    /<meta\b[^<]*>/gi
  ];

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|\/\*|\*\/|;|\|)/g,
    /(\b(or|and)\b.*=.*)/gi,
    /('|\"|`)(.*)\1/g
  ];

  private static readonly COMMAND_INJECTION_PATTERNS = [
    /(\||&|;|`|\$\(|\$\{)/g,
    /(rm\s+-rf|del\s+\/|format\s+c:)/gi,
    /(wget|curl|nc|netcat|telnet|ssh|ftp)/gi,
    /(eval|exec|system|shell_exec)/gi
  ];

  static sanitizeString(input: string, type: 'general' | 'script' | 'sql' = 'general'): string {
    if (!input || typeof input !== 'string') return '';

    let sanitized = input.trim();

    // Remove XSS patterns
    this.XSS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    if (type === 'sql') {
      // Additional SQL injection protection
      this.SQL_INJECTION_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
    }

    if (type === 'script') {
      // Command injection protection for script content
      // Note: This is basic protection, full script validation comes later
      sanitized = sanitized.replace(/[\x00-\x1f\x7f-\x9f]/g, ''); // Remove control characters
    }

    return sanitized;
  }

  static sanitizeObject(obj: any, type: 'general' | 'script' | 'sql' = 'general'): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj, type);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, type));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[this.sanitizeString(key)] = this.sanitizeObject(value, type);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Input sanitization middleware factory
export const sanitizeInput = (type: 'general' | 'script' | 'sql' = 'general') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body) {
        req.body = InputSanitizer.sanitizeObject(req.body, type);
      }
      if (req.query) {
        req.query = InputSanitizer.sanitizeObject(req.query, type);
      }
      if (req.params) {
        req.params = InputSanitizer.sanitizeObject(req.params, type);
      }
      next();
    } catch (error) {
      logger.error('Input sanitization error', { error, url: req.originalUrl });
      next(createError('Invalid input data', 400));
    }
  };
};

// Request validation middleware
export const validateRequest = (schema: Joi.ObjectSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[source];
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Request validation failed', {
        url: req.originalUrl,
        method: req.method,
        errors: details,
        ip: req.ip
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details
      });
    }

    req[source] = value;
    next();
  };
};

// Security audit middleware
export const securityAudit = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log security-relevant request details
  const securityContext = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.originalUrl,
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    referer: req.get('Referer'),
    origin: req.get('Origin')
  };

  // Detect suspicious patterns
  const suspiciousPatterns = [
    /(\.\.|\/\/|\\\\)/g, // Path traversal
    /(script|javascript|vbscript|onload|onerror)/gi, // XSS attempts
    /(union|select|insert|drop|delete)/gi, // SQL injection
    /(eval|exec|system|cmd)/gi, // Command injection
    /(<|>|"|'|&|;|\|)/g // Special characters
  ];

  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params
  });

  const suspiciousActivity = suspiciousPatterns.some(pattern => 
    pattern.test(requestData) || pattern.test(req.originalUrl)
  );

  if (suspiciousActivity) {
    logger.warn('Suspicious request detected', {
      ...securityContext,
      requestData: requestData.substring(0, 500) // Limit log size
    });
  }

  // Continue with request processing
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseContext = {
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    };

    // Log high-value or failed requests
    if (res.statusCode >= 400 || duration > 5000 || suspiciousActivity) {
      logger.info('Security audit log', {
        ...securityContext,
        ...responseContext,
        suspicious: suspiciousActivity
      });
    }
  });

  next();
};

// CORS configuration with security considerations
export const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      logger.warn('CORS violation', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Session-ID'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

// Password strength validation
export const passwordStrengthSchema = Joi.string()
  .min(12)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .message('Password must be at least 12 characters long and contain at least one lowercase letter, one uppercase letter, one digit, and one special character');

// Enhanced validation schemas
export const enhancedValidationSchemas = {
  email: Joi.string().email().max(255).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: passwordStrengthSchema,
  uuid: Joi.string().uuid().required(),
  scriptName: Joi.string().min(1).max(100).pattern(/^[a-zA-Z0-9\s\-_\.]+$/).required(),
  scriptContent: Joi.string().min(1).max(50000).required(),
  scriptLanguage: Joi.string().valid('bash', 'powershell', 'python', 'ansible', 'batch').required(),
  scriptCategory: Joi.string().valid('monitoring', 'maintenance', 'deployment', 'backup', 'security', 'diagnostics', 'other').required(),
  ipAddress: Joi.string().ip().required(),
  port: Joi.number().port().required(),
  url: Joi.string().uri().max(2048).required()
};

// Request size limiter
export const requestSizeLimiter = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      logger.warn('Request size exceeded', {
        contentLength,
        maxBytes,
        ip: req.ip,
        url: req.originalUrl
      });
      
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        maxSize
      });
    }
    
    next();
  };
};

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)([a-z]*)$/);
  if (!match) return 0;
  
  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || 1);
}

// Security headers middleware for API responses
export const apiSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};