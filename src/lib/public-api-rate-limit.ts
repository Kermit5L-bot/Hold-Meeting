import { getRequestClientKey } from "@/lib/request-client";

interface RateLimitState {
  count: number;
  resetAt: number;
}

const maxTrackedKeys = 20_000;

function rateLimitStore() {
  const globalForRateLimit = globalThis as typeof globalThis & {
    __holdMeetingPublicApiRateLimits?: Map<string, RateLimitState>;
  };

  globalForRateLimit.__holdMeetingPublicApiRateLimits ??= new Map();
  return globalForRateLimit.__holdMeetingPublicApiRateLimits;
}

function pruneStore(store: Map<string, RateLimitState>, now: number) {
  for (const [key, state] of store) {
    if (state.resetAt <= now || store.size >= maxTrackedKeys) {
      store.delete(key);
    }
    if (store.size < maxTrackedKeys) break;
  }
}

export function consumePublicApiRateLimit({
  request,
  scope,
  limit,
  windowMs,
  now = Date.now(),
}: {
  request: Request;
  scope: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  const store = rateLimitStore();
  const key = `${scope}:${getRequestClientKey(request)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    if (store.size >= maxTrackedKeys) pruneStore(store, now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false as const,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
    };
  }

  current.count += 1;
  return { allowed: true as const, retryAfterSeconds: 0 };
}

export function publicApiRateLimitResponse(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  const result = consumePublicApiRateLimit({
    request,
    scope,
    limit,
    windowMs,
  });

  if (result.allowed) {
    return null;
  }

  return Response.json(
    { message: "请求过于频繁，请稍后重试。" },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.retryAfterSeconds),
      },
    },
  );
}
