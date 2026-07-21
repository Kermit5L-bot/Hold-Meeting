export const authCookieName = "hm_session";

export interface AuthSession {
  userId: string;
  username: string;
  role: "super_admin" | "admin";
  displayName: string;
  authVersion: number;
  exp: number;
}

export type PublicSuccessType = "registration" | "checkin" | "walk_in_checkin";

export interface PublicSuccessTokenPayload {
  registrationId: string;
  meetingId: string;
  type: PublicSuccessType;
  exp: number;
}

function getSessionSecret() {
  const configuredSecret =
    process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "";

  if (process.env.NODE_ENV === "production" && configuredSecret.length < 32) {
    throw new Error(
      "生产环境必须配置至少 32 个字符的 ADMIN_SESSION_SECRET。",
    );
  }

  return (
    configuredSecret ||
    "local-development-session-secret-change-before-production"
  );
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

async function hmacSha256(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createSessionToken(session: AuthSession) {
  const payload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(session)),
  );
  const signature = await hmacSha256(payload);
  return `${payload}.${signature}`;
}

export async function createPublicSuccessToken(
  payload: Omit<PublicSuccessTokenPayload, "exp">,
  maxAgeSeconds = 2 * 60 * 60,
) {
  const value = bytesToBase64Url(
    new TextEncoder().encode(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
      }),
    ),
  );
  const signature = await hmacSha256(`public-success:${value}`);
  return `${value}.${signature}`;
}

export async function verifyPublicSuccessToken(token?: string | null) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [value, signature] = parts;
  if (!value || !signature) return null;
  const expectedSignature = await hmacSha256(`public-success:${value}`);
  if (!timingSafeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(value)),
    ) as PublicSuccessTokenPayload;
    if (
      typeof payload.registrationId !== "string" ||
      !payload.registrationId ||
      typeof payload.meetingId !== "string" ||
      !payload.meetingId ||
      !["registration", "checkin", "walk_in_checkin"].includes(payload.type) ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token?: string | null) {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payload, signature] = parts;

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await hmacSha256(payload);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlToBytes(payload));
    const session = JSON.parse(decoded) as AuthSession;

    if (
      typeof session.userId !== "string" ||
      !session.userId ||
      typeof session.username !== "string" ||
      !session.username ||
      !["super_admin", "admin"].includes(session.role) ||
      typeof session.displayName !== "string" ||
      typeof session.authVersion !== "number" ||
      !Number.isSafeInteger(session.authVersion) ||
      typeof session.exp !== "number" ||
      !Number.isSafeInteger(session.exp)
    ) {
      return null;
    }

    if (session.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function getSessionMaxAge(remember: boolean) {
  return remember ? 60 * 60 * 24 * 30 : 60 * 60 * 8;
}
