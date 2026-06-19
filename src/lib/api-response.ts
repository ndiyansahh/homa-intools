import { NextRequest, NextResponse } from 'next/server';
import { logApiError } from './logger';
import { getSession } from './auth';

type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse>;

// Wraps an API route handler — catches unhandled errors and sends Telegram alert
export function withApiLogger(endpoint: string, handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    try {
      const response = await handler(req, ctx);
      const status = response.status;

      // Only alert on server errors (500+), not client errors (4xx)
      if (status >= 500) {
        const session = await getSession().catch(() => null);
        const body = await response.clone().json().catch(() => ({}));
        await logApiError({
          method: req.method,
          endpoint,
          status,
          error: body?.error || body?.message || 'Unknown error',
          email: (session as any)?.email,
        });
      }

      return response;
    } catch (error) {
      const session = await getSession().catch(() => null);
      await logApiError({
        method: req.method,
        endpoint,
        status: 500,
        error: error instanceof Error ? error.message : String(error),
        email: (session as any)?.email,
      });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
