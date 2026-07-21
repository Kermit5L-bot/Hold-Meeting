import { NextResponse } from "next/server";
import { authCookieName } from "@/lib/auth-session";
import { changeAdminPassword } from "@/lib/admin-users";
import { authorizeAdminRequest } from "@/lib/admin-access";

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  if (typeof body?.currentPassword !== "string" || typeof body.newPassword !== "string") return NextResponse.json({ message: "请填写当前密码和新密码" }, { status: 400 });
  try {
    const changed = await changeAdminPassword(auth.user.id, body.currentPassword, body.newPassword);
    if (!changed) return NextResponse.json({ message: "当前密码错误" }, { status: 400 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(authCookieName, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "修改失败" }, { status: 400 });
  }
}
