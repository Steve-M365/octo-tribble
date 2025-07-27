import { Router } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

import { getDatabase } from '../database/init';
import { Script, ScriptLanguage, ScriptParameter } from '../types';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthRequest, requireAdminOrPowerUser } from '../middleware/auth';
import { logAudit } from '../services/auditService';

export const scriptRoutes = Router();

// All routes require authentication
scriptRoutes.use(authenticateToken);

// Validation schemas
const scriptSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  content: Joi.string().required(),
  language: Joi.string().valid(...Object.values(ScriptLanguage)).required(),
  category: Joi.string().default('general'),
  requires_elevation: Joi.boolean().default(false),
  parameters: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('string', 'number', 'boolean', 'file', 'directory', 'password').required(),
    required: Joi.boolean().default(false),
    description: Joi.string().optional(),
    default_value: Joi.string().optional(),
    validation_pattern: Joi.string().optional()
  })).default([])
});

const updateScriptSchema = scriptSchema.keys({
  name: Joi.string().min(1).max(100).optional(),
  content: Joi.string().optional(),
  language: Joi.string().valid(...Object.values(ScriptLanguage)).optional()
});

// Get all scripts (with permissions check)
scriptRoutes.get('/', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  let scripts;
  
  // Admins and power users can see all scripts
  if (userRole === 'admin' || userRole === 'power_user') {
    scripts = await db.all<Script>(`
      SELECT s.*, u.username as created_by_username
      FROM scripts s
      JOIN users u ON s.created_by = u.id
      WHERE s.is_active = 1
      ORDER BY s.created_at DESC
    `);
  } else {
    // Regular users only see scripts they have permission to access
    scripts = await db.all<Script>(`
      SELECT DISTINCT s.*, u.username as created_by_username
      FROM scripts s
      JOIN users u ON s.created_by = u.id
      LEFT JOIN permissions p ON s.id = p.script_id AND p.user_id = ?
      WHERE s.is_active = 1 AND (s.created_by = ? OR p.can_execute = 1)
      ORDER BY s.created_at DESC
    `, [userId, userId]);
  }

  // Parse parameters JSON
  const scriptsWithParsedParams = scripts.map(script => ({
    ...script,
    parameters: JSON.parse(script.parameters || '[]')
  }));

  res.json({
    success: true,
    data: scriptsWithParsedParams
  });
}));

// Get script by ID
scriptRoutes.get('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  const script = await db.get<Script>(`
    SELECT s.*, u.username as created_by_username
    FROM scripts s
    JOIN users u ON s.created_by = u.id
    WHERE s.id = ? AND s.is_active = 1
  `, [id]);

  if (!script) {
    throw createError('Script not found', 404);
  }

  // Check permissions
  if (userRole !== 'admin' && userRole !== 'power_user' && script.created_by !== userId) {
    const permission = await db.get(
      'SELECT can_execute, can_edit FROM permissions WHERE user_id = ? AND script_id = ?',
      [userId, id]
    );

    if (!permission || !permission.can_execute) {
      throw createError('Access denied', 403);
    }
  }

  // Parse parameters
  script.parameters = JSON.parse(script.parameters || '[]');

  res.json({
    success: true,
    data: script
  });
}));

// Create new script
scriptRoutes.post('/', requireAdminOrPowerUser, asyncHandler(async (req: AuthRequest, res) => {
  const { error, value } = scriptSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const scriptId = uuidv4();
  const userId = req.user!.userId;

  await db.run(`
    INSERT INTO scripts (id, name, description, content, language, category, requires_elevation, parameters, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    scriptId,
    value.name,
    value.description || null,
    value.content,
    value.language,
    value.category,
    value.requires_elevation ? 1 : 0,
    JSON.stringify(value.parameters),
    userId
  ]);

  // Log script creation
  await logAudit(userId, 'CREATE_SCRIPT', 'script', scriptId, {
    name: value.name,
    language: value.language,
    category: value.category
  });

  logger.info('Script created', { scriptId, name: value.name, createdBy: userId });

  res.status(201).json({
    success: true,
    message: 'Script created successfully',
    data: { id: scriptId }
  });
}));

// Update script
scriptRoutes.put('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { error, value } = updateScriptSchema.validate(req.body);
  
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const db = getDatabase();
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  // Get existing script
  const script = await db.get<Script>('SELECT * FROM scripts WHERE id = ? AND is_active = 1', [id]);
  if (!script) {
    throw createError('Script not found', 404);
  }

  // Check permissions
  let canEdit = false;
  if (userRole === 'admin' || userRole === 'power_user' || script.created_by === userId) {
    canEdit = true;
  } else {
    const permission = await db.get(
      'SELECT can_edit FROM permissions WHERE user_id = ? AND script_id = ?',
      [userId, id]
    );
    canEdit = permission?.can_edit === 1;
  }

  if (!canEdit) {
    throw createError('Access denied', 403);
  }

  // Build update query
  const updates = [];
  const params = [];
  
  if (value.name !== undefined) {
    updates.push('name = ?');
    params.push(value.name);
  }
  if (value.description !== undefined) {
    updates.push('description = ?');
    params.push(value.description);
  }
  if (value.content !== undefined) {
    updates.push('content = ?');
    params.push(value.content);
  }
  if (value.language !== undefined) {
    updates.push('language = ?');
    params.push(value.language);
  }
  if (value.category !== undefined) {
    updates.push('category = ?');
    params.push(value.category);
  }
  if (value.requires_elevation !== undefined) {
    updates.push('requires_elevation = ?');
    params.push(value.requires_elevation ? 1 : 0);
  }
  if (value.parameters !== undefined) {
    updates.push('parameters = ?');
    params.push(JSON.stringify(value.parameters));
  }

  if (updates.length === 0) {
    throw createError('No valid fields to update', 400);
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  updates.push('version = version + 1');
  params.push(id);

  await db.run(`
    UPDATE scripts SET ${updates.join(', ')} WHERE id = ?
  `, params);

  // Log script update
  await logAudit(userId, 'UPDATE_SCRIPT', 'script', id, value);

  logger.info('Script updated', { scriptId: id, updatedBy: userId });

  res.json({
    success: true,
    message: 'Script updated successfully'
  });
}));

// Delete script (soft delete)
scriptRoutes.delete('/:id', asyncHandler(async (req: AuthRequest, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  // Get existing script
  const script = await db.get<Script>('SELECT * FROM scripts WHERE id = ? AND is_active = 1', [id]);
  if (!script) {
    throw createError('Script not found', 404);
  }

  // Check permissions
  let canDelete = false;
  if (userRole === 'admin' || script.created_by === userId) {
    canDelete = true;
  } else if (userRole === 'power_user') {
    const permission = await db.get(
      'SELECT can_delete FROM permissions WHERE user_id = ? AND script_id = ?',
      [userId, id]
    );
    canDelete = permission?.can_delete === 1;
  }

  if (!canDelete) {
    throw createError('Access denied', 403);
  }

  // Soft delete
  await db.run(
    'UPDATE scripts SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );

  // Log script deletion
  await logAudit(userId, 'DELETE_SCRIPT', 'script', id, {
    name: script.name
  });

  logger.info('Script deleted', { scriptId: id, deletedBy: userId });

  res.json({
    success: true,
    message: 'Script deleted successfully'
  });
}));

// Get script categories
scriptRoutes.get('/meta/categories', asyncHandler(async (req: AuthRequest, res) => {
  const db = getDatabase();
  
  const categories = await db.all<{ category: string, count: number }>(`
    SELECT category, COUNT(*) as count
    FROM scripts
    WHERE is_active = 1
    GROUP BY category
    ORDER BY category
  `);

  res.json({
    success: true,
    data: categories
  });
}));