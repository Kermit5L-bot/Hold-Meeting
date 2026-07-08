import { previewResponse } from "@/lib/import-api";

export async function POST(request: Request) {
  return previewResponse("marketing-meetings", request);
}
