import { previewResponse } from "@/lib/import-api";

export async function POST(request: Request) {
  return previewResponse("external-forums", request);
}
