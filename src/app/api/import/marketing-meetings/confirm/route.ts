import { confirmResponse } from "@/lib/import-api";

export async function POST(request: Request) {
  return confirmResponse("marketing-meetings", request);
}
