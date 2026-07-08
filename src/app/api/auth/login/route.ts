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

const genericError = "账号或密码错误";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | {
        username?: string;
        password?: string;
        remember?: boolean;
      }
    | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";

  if (!username || !password) {
    return NextResponse.json({ message: "请填写账号和密码" }, { status: 400 });
  }

  const user = await findAdminUserByUsername(username);
  const isValidUser =
    user && user.status === "active"
      ? await verifyPassword(password, user.passwordHash)
      : false;

  if (!user || !isValidUser) {
    return NextResponse.json({ message: genericError }, { status: 401 });
  }

  const maxAge = getSessionMaxAge(Boolean(body?.remember));
  const token = await createSessionToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    exp: Math.floor(Date.now() / 1000) + maxAge,
  });
  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
    },
  });

  response.cookies.set(authCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });

  await updateAdminLastLogin(user.id);

  return response;
}
