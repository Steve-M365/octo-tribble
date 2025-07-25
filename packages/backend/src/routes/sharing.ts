import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';

import { getDatabase } from '../database/init';
import { 
  ShareableLink, 
  ShareRequest, 
  ShareResponse, 
  ShareableResourceType, 
  ShareAccessLevel,
  QuickActionLink,
  QuickActionType,
  ShortUrl
} from '../types';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const sharingRoutes = Router();

// Validation schemas
const shareRequestSchema = Joi.object({
  resource_type: Joi.string().valid(...Object.values(ShareableResourceType)).required(),
  resource_id: Joi.string().required(),
  access_level: Joi.string().valid(...Object.values(ShareAccessLevel)).required(),
  expires_in_hours: Joi.number().min(1).max(8760).optional(), // Max 1 year
  password: Joi.string().min(6).optional(),
  max_uses: Joi.number().min(1).max(1000).optional(),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  allowed_domains: Joi.array().items(Joi.string()).optional(),
  allowed_user_roles: Joi.array().items(Joi.string()).optional(),
  notify_on_access: Joi.boolean().default(false),
  custom_message: Joi.string().max(500).optional()
});

const quickActionSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).required(),
  icon: Joi.string().max(50).required(),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).required(),
  action_type: Joi.string().valid(...Object.values(QuickActionType)).required(),
  target_resource_id: Joi.string().required(),
  parameters: Joi.object().default({}),
  requires_confirmation: Joi.boolean().default(false),
  confirmation_message: Joi.string().max(200).optional(),
  success_message: Joi.string().max(200).required(),
  error_message: Joi.string().max(200).required()
});

// Create shareable link
sharingRoutes.post('/create', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = shareRequestSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const userId = req.user!.userId;
  const shareRequest: ShareRequest = value;

  // Verify user has access to the resource
  const hasAccess = await verifyResourceAccess(shareRequest.resource_type, shareRequest.resource_id, userId);
  if (!hasAccess) {
    throw createError('Access denied to resource', 403);
  }

  // Generate share token and short code
  const shareId = uuidv4();
  const shareToken = crypto.randomBytes(32).toString('hex');
  const shortCode = generateShortCode();

  // Hash password if provided
  let passwordHash = null;
  if (shareRequest.password) {
    passwordHash = crypto.createHash('sha256').update(shareRequest.password).digest('hex');
  }

  // Calculate expiration
  let expiresAt = null;
  if (shareRequest.expires_in_hours) {
    expiresAt = new Date(Date.now() + shareRequest.expires_in_hours * 60 * 60 * 1000).toISOString();
  }

  // Get resource metadata
  const metadata = await getResourceMetadata(shareRequest.resource_type, shareRequest.resource_id);

  // Create shareable link
  await db.run(`
    INSERT INTO shareable_links (
      id, resource_type, resource_id, share_token, created_by, expires_at,
      access_level, password_protected, password_hash, max_uses, current_uses,
      is_active, title, description, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    shareId,
    shareRequest.resource_type,
    shareRequest.resource_id,
    shareToken,
    userId,
    expiresAt,
    shareRequest.access_level,
    !!shareRequest.password,
    passwordHash,
    shareRequest.max_uses || null,
    0,
    1,
    shareRequest.title || metadata.title,
    shareRequest.description || metadata.description,
    JSON.stringify({
      ...metadata,
      allowed_domains: shareRequest.allowed_domains || [],
      allowed_user_roles: shareRequest.allowed_user_roles || [],
      requires_authentication: shareRequest.access_level !== ShareAccessLevel.VIEW_ONLY
    })
  ]);

  // Create short URL
  const shortUrl = await createShortUrl(shareToken, shortCode, userId);

  // Generate QR code
  const shareUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;
  const qrCodeDataUrl = await QRCode.toDataURL(shareUrl);

  // Log audit event
  await logAudit(userId, 'CREATE_SHARE', shareRequest.resource_type, shareRequest.resource_id, {
    share_id: shareId,
    access_level: shareRequest.access_level,
    expires_at: expiresAt
  });

  const response: ShareResponse = {
    share_id: shareId,
    share_url: shareUrl,
    qr_code_url: qrCodeDataUrl,
    short_url: `${process.env.FRONTEND_URL}/s/${shortCode}`,
    embed_code: generateEmbedCode(shareToken, shareRequest.resource_type),
    expires_at: expiresAt,
    access_instructions: generateAccessInstructions(shareRequest)
  };

  res.status(201).json({
    success: true,
    data: response
  });
}));

// Access shared resource
sharingRoutes.get('/access/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.query;
  const db = getDatabase();

  // Find shareable link
  const shareLink = await db.get<ShareableLink>(`
    SELECT * FROM shareable_links 
    WHERE share_token = ? AND is_active = 1
  `, [token]);

  if (!shareLink) {
    throw createError('Share link not found or expired', 404);
  }

  // Check expiration
  if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
    throw createError('Share link has expired', 410);
  }

  // Check max uses
  if (shareLink.max_uses && shareLink.current_uses >= shareLink.max_uses) {
    throw createError('Share link has reached maximum usage limit', 410);
  }

  // Check password
  if (shareLink.password_protected) {
    if (!password) {
      return res.status(401).json({
        success: false,
        error: 'Password required',
        requires_password: true
      });
    }

    const passwordHash = crypto.createHash('sha256').update(password as string).digest('hex');
    if (passwordHash !== shareLink.password_hash) {
      throw createError('Invalid password', 401);
    }
  }

  // Get resource data
  const resourceData = await getResourceData(shareLink.resource_type, shareLink.resource_id);
  if (!resourceData) {
    throw createError('Resource not found', 404);
  }

  // Log access
  await logShareAccess(shareLink.id, req.ip, req.get('User-Agent') || '', 'view');

  // Increment usage counter
  await db.run(
    'UPDATE shareable_links SET current_uses = current_uses + 1 WHERE id = ?',
    [shareLink.id]
  );

  res.json({
    success: true,
    data: {
      resource: resourceData,
      share_info: {
        title: shareLink.title,
        description: shareLink.description,
        access_level: shareLink.access_level,
        created_at: shareLink.created_at
      }
    }
  });
}));

// Create quick action link
sharingRoutes.post('/quick-action', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = quickActionSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const userId = req.user!.userId;
  const quickActionId = uuidv4();

  await db.run(`
    INSERT INTO quick_action_links (
      id, name, description, icon, color, action_type, target_resource_id,
      parameters, requires_confirmation, confirmation_message, success_message,
      error_message, is_active, usage_count, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    quickActionId,
    value.name,
    value.description,
    value.icon,
    value.color,
    value.action_type,
    value.target_resource_id,
    JSON.stringify(value.parameters),
    value.requires_confirmation,
    value.confirmation_message || null,
    value.success_message,
    value.error_message,
    1,
    0,
    userId
  ]);

  await logAudit(userId, 'CREATE_QUICK_ACTION', 'quick_action', quickActionId, value);

  res.status(201).json({
    success: true,
    data: { id: quickActionId }
  });
}));

// Get user's shared links
sharingRoutes.get('/my-shares', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  const userId = req.user!.userId;

  const shares = await db.all(`
    SELECT 
      sl.*,
      CASE 
        WHEN sl.resource_type = 'script' THEN s.name
        WHEN sl.resource_type = 'service_ticket' THEN st.title
        ELSE sl.title
      END as resource_name
    FROM shareable_links sl
    LEFT JOIN scripts s ON sl.resource_type = 'script' AND sl.resource_id = s.id
    LEFT JOIN service_tickets st ON sl.resource_type = 'service_ticket' AND sl.resource_id = st.id
    WHERE sl.created_by = ?
    ORDER BY sl.created_at DESC
  `, [userId]);

  res.json({
    success: true,
    data: shares.map(share => ({
      ...share,
      metadata: JSON.parse(share.metadata || '{}'),
      share_url: `${process.env.FRONTEND_URL}/shared/${share.share_token}`
    }))
  });
}));

// Get share analytics
sharingRoutes.get('/analytics/:shareId', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { shareId } = req.params;
  const db = getDatabase();
  const userId = req.user!.userId;

  // Verify ownership
  const share = await db.get(
    'SELECT created_by FROM shareable_links WHERE id = ?',
    [shareId]
  );

  if (!share || share.created_by !== userId) {
    throw createError('Share not found or access denied', 404);
  }

  // Get access logs
  const accessLogs = await db.all(`
    SELECT * FROM share_access_logs 
    WHERE share_id = ? 
    ORDER BY accessed_at DESC
  `, [shareId]);

  // Calculate analytics
  const analytics = {
    total_accesses: accessLogs.length,
    unique_visitors: new Set(accessLogs.map(log => log.accessed_by_ip)).size,
    accesses_by_date: calculateAccessesByDate(accessLogs),
    top_referrers: calculateTopReferrers(accessLogs),
    geographic_data: calculateGeographicData(accessLogs),
    recent_accesses: accessLogs.slice(0, 10)
  };

  res.json({
    success: true,
    data: analytics
  });
}));

// Revoke share
sharingRoutes.delete('/:shareId', authenticateToken, asyncHandler(async (req: AuthRequest, res) => {
  const { shareId } = req.params;
  const db = getDatabase();
  const userId = req.user!.userId;

  // Verify ownership
  const share = await db.get(
    'SELECT created_by FROM shareable_links WHERE id = ?',
    [shareId]
  );

  if (!share || share.created_by !== userId) {
    throw createError('Share not found or access denied', 404);
  }

  // Deactivate share
  await db.run(
    'UPDATE shareable_links SET is_active = 0 WHERE id = ?',
    [shareId]
  );

  await logAudit(userId, 'REVOKE_SHARE', 'shareable_link', shareId, {});

  res.json({
    success: true,
    message: 'Share link revoked successfully'
  });
}));

// Helper functions
async function verifyResourceAccess(resourceType: ShareableResourceType, resourceId: string, userId: string): Promise<boolean> {
  const db = getDatabase();
  
  switch (resourceType) {
    case ShareableResourceType.SCRIPT:
      const script = await db.get(
        'SELECT created_by FROM scripts WHERE id = ? AND is_active = 1',
        [resourceId]
      );
      return script && (script.created_by === userId);
    
    case ShareableResourceType.SERVICE_TICKET:
      const ticket = await db.get(
        'SELECT requester_id, assigned_agent_id FROM service_tickets WHERE id = ?',
        [resourceId]
      );
      return ticket && (ticket.requester_id === userId || ticket.assigned_agent_id === userId);
    
    default:
      return false;
  }
}

async function getResourceMetadata(resourceType: ShareableResourceType, resourceId: string) {
  const db = getDatabase();
  
  switch (resourceType) {
    case ShareableResourceType.SCRIPT:
      const script = await db.get(
        'SELECT name, description, language, category FROM scripts WHERE id = ?',
        [resourceId]
      );
      return {
        title: script?.name || 'Script',
        description: script?.description || '',
        script_language: script?.language,
        script_category: script?.category
      };
    
    case ShareableResourceType.SERVICE_TICKET:
      const ticket = await db.get(
        'SELECT title, description, priority FROM service_tickets WHERE id = ?',
        [resourceId]
      );
      return {
        title: ticket?.title || 'Service Ticket',
        description: ticket?.description || '',
        ticket_priority: ticket?.priority
      };
    
    default:
      return { title: 'Shared Resource', description: '' };
  }
}

async function getResourceData(resourceType: ShareableResourceType, resourceId: string) {
  const db = getDatabase();
  
  switch (resourceType) {
    case ShareableResourceType.SCRIPT:
      return await db.get(`
        SELECT s.*, u.username as created_by_username
        FROM scripts s
        JOIN users u ON s.created_by = u.id
        WHERE s.id = ? AND s.is_active = 1
      `, [resourceId]);
    
    case ShareableResourceType.SERVICE_TICKET:
      return await db.get(`
        SELECT * FROM service_tickets WHERE id = ?
      `, [resourceId]);
    
    default:
      return null;
  }
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createShortUrl(shareToken: string, shortCode: string, userId: string): Promise<string> {
  const db = getDatabase();
  const shortUrlId = uuidv4();
  const originalUrl = `${process.env.FRONTEND_URL}/shared/${shareToken}`;

  await db.run(`
    INSERT INTO short_urls (id, short_code, original_url, created_by, click_count, is_active, analytics_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [shortUrlId, shortCode, originalUrl, userId, 0, 1, 1]);

  return `${process.env.FRONTEND_URL}/s/${shortCode}`;
}

function generateEmbedCode(shareToken: string, resourceType: ShareableResourceType): string {
  const embedUrl = `${process.env.FRONTEND_URL}/embed/${shareToken}`;
  return `<iframe src="${embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>`;
}

function generateAccessInstructions(shareRequest: ShareRequest): string {
  let instructions = 'Click the link to access the shared resource.';
  
  if (shareRequest.password) {
    instructions += ' You will be prompted to enter a password.';
  }
  
  if (shareRequest.access_level === ShareAccessLevel.EXECUTE) {
    instructions += ' You will be able to execute the script with the provided parameters.';
  }
  
  return instructions;
}

async function logShareAccess(shareId: string, ip: string, userAgent: string, action: string) {
  const db = getDatabase();
  const logId = uuidv4();

  await db.run(`
    INSERT INTO share_access_logs (id, share_id, accessed_by_ip, accessed_at, user_agent, action_taken, success)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [logId, shareId, ip, new Date().toISOString(), userAgent, action, 1]);
}

function calculateAccessesByDate(accessLogs: any[]) {
  const dateMap = new Map();
  
  accessLogs.forEach(log => {
    const date = log.accessed_at.split('T')[0];
    dateMap.set(date, (dateMap.get(date) || 0) + 1);
  });
  
  return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
}

function calculateTopReferrers(accessLogs: any[]) {
  // This would need to be implemented based on referrer data
  return [];
}

function calculateGeographicData(accessLogs: any[]) {
  // This would need IP geolocation service integration
  return [];
}