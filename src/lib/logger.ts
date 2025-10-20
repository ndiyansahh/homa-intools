// Simple logger utility for audit events

export interface AuditEvent {
  action: string;
  userId?: string;
  email?: string;
  details?: any;
  timestamp?: Date;
}

export function logAuditEvent(event: AuditEvent): void {
  // In development, just console.log
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', {
      ...event,
      timestamp: new Date().toISOString(),
    });
  }
  
  // In production, you would send this to your logging service
  // e.g., DataDog, CloudWatch, Sentry, etc.
}

export function logAuthEvent(event: AuditEvent): void {
  logAuditEvent({ ...event, action: `auth_${event.action}` });
}

export function logNavigationEvent(event: AuditEvent): void {
  logAuditEvent({ ...event, action: `nav_${event.action}` });
}