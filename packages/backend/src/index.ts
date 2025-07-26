import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from './utils/logger';
import { initializeDatabase } from './database/init';
import { authRoutes } from './routes/auth';
import { scriptRoutes } from './routes/scripts';
import { userRoutes } from './routes/users';
import { executionRoutes } from './routes/execution';
import { auditRoutes } from './routes/audit';
import { sharingRoutes } from './routes/sharing';
import { helpRoutes } from './routes/help';
import { adminRoutes } from './routes/admin';
import { diagnosticRoutes } from './routes/diagnostics';
import { serviceDeskRoutes } from './routes/serviceDesk';
import { setupWebSocket } from './websocket/handler';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { 
  securityHeaders, 
  corsOptions, 
  apiRateLimiter, 
  authRateLimiter, 
  executionRateLimiter,
  sanitizeInput,
  securityAudit,
  apiSecurityHeaders,
  requestSizeLimiter
} from './middleware/security';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Enhanced security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(apiSecurityHeaders);
app.use(securityAudit);
app.use(requestSizeLimiter('50mb'));
app.use(sanitizeInput('general'));

// Apply rate limiting globally
app.use(apiRateLimiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use(requestLogger);

// API Routes with specific rate limiting
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/scripts', scriptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/execution', executionRateLimiter, executionRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sharing', sharingRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/service-desk', serviceDeskRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use(errorHandler);

// Setup WebSocket handling
setupWebSocket(wss);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    logger.info('Database initialized successfully');

    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

startServer();