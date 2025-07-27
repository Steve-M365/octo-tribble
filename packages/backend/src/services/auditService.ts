import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/init';
import { logger } from '../utils/logger';

export async function logAudit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details: Record<string, any> = {},
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const db = getDatabase();
    const auditId = uuidv4();

    await db.run(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      auditId,
      userId,
      action,
      resourceType,
      resourceId || null,
      JSON.stringify(details),
      ipAddress || null,
      userAgent || null
    ]);

    logger.info('Audit log created', {
      auditId,
      userId,
      action,
      resourceType,
      resourceId
    });
  } catch (error) {
    logger.error('Failed to create audit log', {
      error,
      userId,
      action,
      resourceType,
      resourceId
    });
  }
}