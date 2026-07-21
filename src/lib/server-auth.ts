import { cookies } from "next/headers";
import { authCookieName, verifySessionToken } from "@/lib/auth-session";
import { findAdminUserById } from "@/lib/admin-users";

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(authCookieName)?.value);
}

export async function getCurrentAdminUser() {
  const session = await getCurrentAdminSession();
  if (!session) return null;
  const user = await findAdminUserById(session.userId);
  if (!user || user.status !== "active" || user.authVersion !== session.authVersion) return null;
  return user;
}
