export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { logApiError } = await import('./src/lib/logger');
    const original = console.error;

    // Intercept console.error from API catch blocks to send Telegram alerts
    (console as any).error = (...args: any[]) => {
      original(...args);

      const message = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

      // Only alert on API errors (catch blocks log with "API error:" prefix pattern)
      if (message.includes('API error') || message.includes('Error:') || message.includes('error:')) {
        logApiError({
          method: 'UNKNOWN',
          endpoint: 'server',
          status: 500,
          error: message.slice(0, 500),
        }).catch(() => {});
      }
    };
  }
}

export async function onRequestError(
  err: { message: string; digest?: string },
  request: { path: string; method: string },
  context: { routeType: string }
) {
  if (context.routeType === 'route') {
    const { logApiError } = await import('./src/lib/logger');
    await logApiError({
      method: request.method,
      endpoint: request.path,
      status: 500,
      error: err.message,
    });
  }
}
