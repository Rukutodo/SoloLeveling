import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import ApiLog from '@/lib/models/ApiLog';

type RouteType = 'api' | 'ai' | 'auth' | 'finance' | 'health';

// Classify route type from path
function classifyRoute(route: string): RouteType {
  if (route.includes('/api/calories') || route.includes('/api/steps') || route.includes('/api/sleep') || route.includes('/api/body'))
    return 'health';
  if (route.includes('/api/finance'))
    return 'finance';
  if (route.includes('/api/ai') || route.includes('/analyze') || route.includes('/api/quests'))
    return 'ai';
  if (route.includes('/api/auth'))
    return 'auth';
  return 'api';
}

// Fire-and-forget async log writer — never blocks the response
async function writeLog(entry: {
  route: string;
  method: string;
  userId: string | null;
  userEmail: string | null;
  statusCode: number;
  durationMs: number;
  type: RouteType;
  error: string | null;
  userAgent: string | null;
  meta: Record<string, any>;
}) {
  try {
    await dbConnect();
    await ApiLog.create(entry);
  } catch (e) {
    // Silently swallow log write errors — never crash the app for a log failure
    console.error('[Logger] Failed to write log:', e);
  }
}

// ─────────────────────────────────────────────
// AI Rate Limiter — max N AI calls per hour per user
// Uses MongoDB ApiLog collection (no new services needed)
// ─────────────────────────────────────────────
const AI_RATE_LIMIT = 30; // calls per hour
const AI_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function checkAiRateLimit(userId: string): Promise<{ allowed: boolean; count: number; remaining: number }> {
  try {
    await dbConnect();
    const since = new Date(Date.now() - AI_RATE_WINDOW_MS);
    const count = await ApiLog.countDocuments({
      userId,
      type: 'ai',
      timestamp: { $gte: since },
      statusCode: { $lt: 500 }, // only count successful-ish calls
    });
    return {
      allowed: count < AI_RATE_LIMIT,
      count,
      remaining: Math.max(0, AI_RATE_LIMIT - count),
    };
  } catch {
    // If DB check fails, allow the request through (fail open)
    return { allowed: true, count: 0, remaining: AI_RATE_LIMIT };
  }
}

// ─────────────────────────────────────────────
// withLogger — Higher-Order Function to wrap any API route handler
// Usage: export const POST = withLogger(async (req) => { ... });
// ─────────────────────────────────────────────
type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse>;

export function withLogger(handler: RouteHandler, opts?: { enforceAiRateLimit?: boolean }): RouteHandler {
  return async (req: NextRequest, ctx?: any) => {
    const start = Date.now();
    const route = req.nextUrl.pathname;
    const method = req.method;
    const userAgent = req.headers.get('user-agent');
    const type = classifyRoute(route);

    let userId: string | null = null;
    let userEmail: string | null = null;
    let response: NextResponse;
    let errorMsg: string | null = null;

    try {
      // Get session for user context (best-effort, won't block)
      const session = await auth().catch(() => null);
      userId = (session?.user as any)?.id ?? null;
      userEmail = session?.user?.email ?? null;

      // AI rate limiting gate
      if (opts?.enforceAiRateLimit && userId) {
        const { allowed, count, remaining } = await checkAiRateLimit(userId);
        if (!allowed) {
          const limitResponse = NextResponse.json(
            {
              error: `[RATE LIMIT] AI quota exceeded: ${count}/${AI_RATE_LIMIT} calls used this hour. Resets in under 60 minutes.`,
              retryAfter: 3600,
              remaining: 0,
            },
            { status: 429 }
          );
          // Log the rate-limited attempt
          writeLog({ route, method, userId, userEmail, statusCode: 429, durationMs: Date.now() - start, type, error: 'Rate limit exceeded', userAgent, meta: { count, limit: AI_RATE_LIMIT } });
          return limitResponse;
        }
        // Attach remaining quota to response headers downstream
      }

      response = await handler(req, ctx);
    } catch (err: any) {
      errorMsg = err?.message || 'Unhandled exception';
      response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const durationMs = Date.now() - start;
    const statusCode = response.status;

    // Extract error from non-2xx JSON responses
    if (!errorMsg && statusCode >= 400) {
      try {
        const cloned = response.clone();
        const body = await cloned.json();
        errorMsg = body?.error || null;
      } catch {
        errorMsg = `HTTP ${statusCode}`;
      }
    }

    // Fire and forget — response already sent to user
    writeLog({ route, method, userId, userEmail, statusCode, durationMs, type, error: errorMsg, userAgent, meta: {} });

    // Attach observability headers for debugging in browser DevTools
    response.headers.set('X-Response-Time', `${durationMs}ms`);
    response.headers.set('X-Route-Type', type);

    return response;
  };
}
