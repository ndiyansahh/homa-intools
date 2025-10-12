interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  success?: boolean;
  error?: string;
  path?: string;
  menuItem?: string;
}

export function logAuthEvent(entry: Omit<LogEntry, 'timestamp' | 'level'> & { level?: 'info' | 'warn' | 'error' }) {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: entry.level || 'info',
    ...entry,
  };

  console.log(JSON.stringify(logEntry));
}

export function logNavigationEvent(entry: Omit<LogEntry, 'timestamp' | 'level' | 'action'> & { 
  action: 'page_view' | 'menu_click' | 'logout_click';
  level?: 'info' | 'warn' | 'error';
}) {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: entry.level || 'info',
    ...entry,
  };

  console.log(JSON.stringify(logEntry));
}