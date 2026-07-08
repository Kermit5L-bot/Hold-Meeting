import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "@/lib/server-auth";

export async function GET() {
  const session = await getCurrentAdminSession();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.userId,
      username: session.username,
      role: session.role,
      displayName: session.displayName,
    },
  });
}
