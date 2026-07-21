import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionMaxAge,
  authCookieName,
} from "@/lib/auth-session";
import {
  findAdminUserByUsername,
  updateAdminLastLogin,
  verifyPassword,
} from "@/lib/admin-users";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  getLoginClientKey,
  recordLoginFailure,
} from "@/lib/login-rate-limit";

const genericError = "账号或密码错误";

export async function POST(request: Request) {
  const input = await request.json().catch(() => null);
  const body =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const remember = body?.remember === true;
  const clientKey = getLoginClientKey(request);
  const limit = checkLoginRateLimit(clientKey);

  if (!limit.allowed) {
    return NextResponse.json(
      { message: "登录失败次数过多，请稍后再试。" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  if (!username || !password) {
    return NextResponse.json({ message: "请填写账号和密码" }, { status: 400 });
  }

  if (username.length > 100 || password.length > 256) {
    recordLoginFailure(clientKey);
    return NextResponse.json({ message: genericError }, { status: 401 });
  }

  const user = await findAdminUserByUsername(username);
  const isValidUser =
    user && user.status === "active"
      ? await verifyPassword(password, user.passwordHash)
      : false;

  if (!user || !isValidUser) {
    recordLoginFailure(clientKey);
    return NextResponse.json({ message: genericError }, { status: 401 });
  }

  clearLoginFailures(clientKey);
  const maxAge = getSessionMaxAge(remember);
  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    authVersion: user.authVersion,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  });
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      permissions: user.permissions,
    },
  });

  response.cookies.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
    priority: "high",
  });

  await updateAdminLastLogin(user.id);

  return response;
}
