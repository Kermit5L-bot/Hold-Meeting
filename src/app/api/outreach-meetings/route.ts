import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseMeetingFormValues } from "@/lib/admin-form-request";
import {
  createOutreachMeeting,
  readOutreachMeetings,
} from "@/lib/outreach-meetings-store";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope, resolveWriteOwner } from "@/lib/admin-access";
import { readAdminFormAllowedValues } from "@/lib/admin-form-options";

export async function GET(request: Request) {
  const auth = await authorizeAdminRequest("outreach_meetings");
  if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);
  if (!scope) return NextResponse.json({ message: "无权查看该账号数据" }, { status: 403 });
  const meetings = (await readOutreachMeetings()).filter((item) => recordInScope(item.ownerUserId, scope));
  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest("outreach_meetings");
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parseMeetingFormValues(body, await readAdminFormAllowedValues());

  if (!parsed.values) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const ownerUserId = await resolveWriteOwner(auth.user, request, body);
  if (!ownerUserId) return NextResponse.json({ message: "请选择有效的数据归属账号" }, { status: 400 });
  const meeting = await createOutreachMeeting(parsed.values, ownerUserId);
  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  return NextResponse.json({ meeting });
}
