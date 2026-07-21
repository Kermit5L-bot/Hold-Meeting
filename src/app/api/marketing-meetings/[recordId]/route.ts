import { NextResponse } from "next/server";
import { parseMarketingMeetingFormValues } from "@/lib/admin-form-request";
import {
  deleteMarketingMeeting,
  readMarketingMeetings,
  updateMarketingMeeting,
} from "@/lib/marketing-meetings-store";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";
import { readAdminFormAllowedValues } from "@/lib/admin-form-options";

async function authorizeRecord(request: Request, recordId: string) {
  const auth = await authorizeAdminRequest("marketing_meetings");
  if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);
  const record = (await readMarketingMeetings()).find((item) => item.id === recordId);
  if (!scope || !record || !recordInScope(record.ownerUserId, scope)) return NextResponse.json({ message: "未找到记录或无权访问" }, { status: 404 });
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const denied = await authorizeRecord(request, recordId);
  if (denied) return denied;
  const parsed = parseMarketingMeetingFormValues(
    await request.json().catch(() => null),
    await readAdminFormAllowedValues(),
  );

  if (!parsed.values) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const record = await updateMarketingMeeting(recordId, parsed.values);

  if (!record) {
    return NextResponse.json({ message: "未找到记录。" }, { status: 404 });
  }

  return NextResponse.json({ record });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ recordId: string }> },
) {
  const { recordId } = await params;
  const denied = await authorizeRecord(request, recordId);
  if (denied) return denied;
  const deleted = await deleteMarketingMeeting(recordId);

  if (!deleted) {
    return NextResponse.json({ message: "未找到记录。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
