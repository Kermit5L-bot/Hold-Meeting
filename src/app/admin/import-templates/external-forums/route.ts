import { templateResponse } from "@/lib/import-api";
import { authorizeAdminRequest } from "@/lib/admin-access";

export async function GET() {
  const auth = await authorizeAdminRequest("external_forums"); if ("response" in auth) return auth.response;
  return templateResponse("external-forums");
}
