import { NextResponse, type NextRequest } from "next/server";
import { authCookieName, verifySessionToken } from "@/lib/auth-session";

const protectedApiPrefixes = [
  "/api/outreach-meetings",
  "/api/external-forums",
  "/api/marketing-meetings",
  "/api/uploads",
  "/api/import",
  "/api/settings",
  "/api/admin",
  "/api/auth/change-password",
];

function isProtectedApi(pathname: string) {
  return protectedApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(authCookieName)?.value);

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (isProtectedApi(pathname) && !session) {
    return NextResponse.json({ message: "请先登录后台" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/:path*", "/api/:path*"],
};
