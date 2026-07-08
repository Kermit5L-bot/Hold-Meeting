import { cookies } from "next/headers";
import { authCookieName, verifySessionToken } from "@/lib/auth-session";

export async function getCurrentAdminSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(authCookieName)?.value);
}
