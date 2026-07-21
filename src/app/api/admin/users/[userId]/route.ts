import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { softDeleteAdminUser, toPublicAdminUser, updateAdminUser } from "@/lib/admin-users";
import type { AdminModule } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await authorizeAdminRequest(undefined, true);
  if ("response" in auth) return auth.response;
  const { userId } = await params;
  if (userId === auth.user.id) return NextResponse.json({ message: "不能在权限管理中修改当前超级管理员" }, { status: 400 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  try {
    const user = await updateAdminUser(userId, {
      displayName: typeof body?.displayName === "string" ? body.displayName : undefined,
      permissions: Array.isArray(body?.permissions) ? body.permissions.filter((item): item is AdminModule => typeof item === "string") : undefined,
      status: body?.status === "active" || body?.status === "disabled" ? body.status : undefined,
    });
    if (!user) return NextResponse.json({ message: "账号不存在或不可修改" }, { status: 404 });
    return NextResponse.json({ user: toPublicAdminUser(user) });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "保存失败" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await authorizeAdminRequest(undefined, true);
  if ("response" in auth) return auth.response;
  const { userId } = await params;
  if (userId === auth.user.id) return NextResponse.json({ message: "不能删除当前超级管理员" }, { status: 400 });
  const deleted = await softDeleteAdminUser(userId);
  if (!deleted) return NextResponse.json({ message: "账号不存在或不可删除" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
