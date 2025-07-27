import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || '';

  // Log request start
  logger.info('Request started', {
    method,
    url,
    ip,
    userAgent: userAgent.substring(0, 100) // Truncate long user agents
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    const { statusCode } = res;

    logger.info('Request completed', {
      method,
      url,
      statusCode,
      duration,
      ip
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
}