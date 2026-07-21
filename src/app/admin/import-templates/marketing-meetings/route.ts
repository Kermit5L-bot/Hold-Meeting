import { templateResponse } from "@/lib/import-api";
import { authorizeAdminRequest } from "@/lib/admin-access";

export async function GET() {
  const auth = await authorizeAdminRequest("marketing_meetings"); if ("response" in auth) return auth.response;
  return templateResponse("marketing-meetings");
}
