interface LoginAttemptState {
  failedAttempts: number;
  resetAt: number;
}

const windowMs = 15 * 60 * 1000;
const maxFailedAttempts = 8;
const maxTrackedClients = 10_000;

function attemptStore() {
  const globalForAttempts = globalThis as typeof globalThis & {
    __holdMeetingLoginAttempts?: Map<string, LoginAttemptState>;
  };

  globalForAttempts.__holdMeetingLoginAttempts ??= new Map();
  return globalForAttempts.__holdMeetingLoginAttempts;
}

export function getLoginClientKey(request: Request) {
  return getRequestClientKey(request);
}

export function checkLoginRateLimit(clientKey: string, now = Date.now()) {
  const store = attemptStore();
  const current = store.get(clientKey);

  if (!current || current.resetAt <= now) {
    if (current) store.delete(clientKey);
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  if (current.failedAttempts < maxFailedAttempts) {
    return { allowed: true as const, retryAfterSeconds: 0 };
  }

  return {
    allowed: false as const,
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

export function recordLoginFailure(clientKey: string, now = Date.now()) {
  const store = attemptStore();
  const current = store.get(clientKey);

  if (!current || current.resetAt <= now) {
    if (store.size >= maxTrackedClients) {
      for (const [key, state] of store) {
        if (state.resetAt <= now || store.size >= maxTrackedClients) {
          store.delete(key);
        }
        if (store.size < maxTrackedClients) break;
      }
    }
    store.set(clientKey, { failedAttempts: 1, resetAt: now + windowMs });
    return;
  }

  current.failedAttempts += 1;
}

export function clearLoginFailures(clientKey: string) {
  attemptStore().delete(clientKey);
}
import { getRequestClientKey } from "@/lib/request-client";
