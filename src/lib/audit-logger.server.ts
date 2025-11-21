// Server-only audit logger with database persistence
// This file should ONLY be imported in API routes (server-side code)

import { db } from './db';
import { auditLogDB } from './schema';

export interface DetailedAuditLog {
  userId: string;
  userEmail: string;
  action: string;
  entityType: 'mitra' | 'customer' | 'visit' | 'trial' | 'attendance' | 'payout' | 'invoice';
  entityId: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a detailed audit event to the database
 * This function persists audit logs for compliance and evidence tracking
 *
 * WARNING: This function can ONLY be used in server-side code (API routes)
 */
export async function logDetailedAudit(log: DetailedAuditLog): Promise<void> {
  try {
    await db.insert(auditLogDB).values({
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      oldValue: log.oldValue ? log.oldValue : null,
      newValue: log.newValue ? log.newValue : null,
      ipAddress: log.ipAddress || null,
      userAgent: log.userAgent || null,
    });

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AUDIT DB]', {
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        user: log.userEmail,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failures shouldn't break the application
  }
}

/**
 * Helper function to extract changed fields between old and new objects
 * Only returns fields that actually changed
 */
export function getChangedFields(oldValue: any, newValue: any): { old: any; new: any } {
  const changes: { old: any; new: any } = { old: {}, new: {} };

  if (!oldValue || !newValue) return changes;

  for (const key in newValue) {
    if (oldValue[key] !== newValue[key]) {
      changes.old[key] = oldValue[key];
      changes.new[key] = newValue[key];
    }
  }

  return changes;
}
