import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { resetAdminPassword } from "@/lib/admin-users";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await authorizeAdminRequest(undefined, true);
  if ("response" in auth) return auth.response;
  const { userId } = await params;
  if (userId === auth.user.id) return NextResponse.json({ message: "请通过右上角修改自己的密码" }, { status: 400 });
  const body = await request.json().catch(() => null) as { password?: unknown } | null;
  try {
    const user = await resetAdminPassword(userId, typeof body?.password === "string" ? body.password : "");
    if (!user) return NextResponse.json({ message: "账号不存在或不可重置" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "重置失败" }, { status: 400 });
  }
}
