import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/server-auth";

export async function GET() {
  const user = await getCurrentAdminUser();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      permissions: user.permissions,
    },
  });
}
