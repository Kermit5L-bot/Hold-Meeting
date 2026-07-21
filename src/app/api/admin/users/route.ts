import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import { createAdminUser, readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";
import type { AdminModule } from "@/lib/types";

export async function GET() {
  const auth = await authorizeAdminRequest(undefined, true);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ users: (await readAdminUsers()).map(toPublicAdminUser) });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest(undefined, true);
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  try {
    const user = await createAdminUser({
      username: typeof body?.username === "string" ? body.username : "",
      displayName: typeof body?.displayName === "string" ? body.displayName : "",
      password: typeof body?.password === "string" ? body.password : "",
      permissions: Array.isArray(body?.permissions) ? body.permissions.filter((item): item is AdminModule => typeof item === "string") : [],
    });
    return NextResponse.json({ user: toPublicAdminUser(user) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "新建账号失败" }, { status: 400 });
  }
}
