import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { parseMeetingFormValues } from "@/lib/admin-form-request";
import {
  deleteOutreachMeeting,
  findOutreachMeeting,
  updateOutreachMeeting,
} from "@/lib/outreach-meetings-store";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";
import { readAdminFormAllowedValues } from "@/lib/admin-form-options";

async function authorizeMeeting(request: Request, meetingId: string) {
  const auth = await authorizeAdminRequest("outreach_meetings");
  if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);
  const meeting = await findOutreachMeeting(meetingId);
  if (!scope || !meeting || !recordInScope(meeting.ownerUserId, scope)) return NextResponse.json({ message: "未找到会议或无权访问" }, { status: 404 });
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const denied = await authorizeMeeting(request, meetingId);
  if (denied) return denied;
  const parsed = parseMeetingFormValues(
    await request.json().catch(() => null),
    await readAdminFormAllowedValues(),
  );

  if (!parsed.values) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const meeting = await updateOutreachMeeting(meetingId, parsed.values);

  if (!meeting) {
    return NextResponse.json({ message: "未找到会议。" }, { status: 404 });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  revalidatePath(`/admin/outreach-meetings/${meetingId}`);
  return NextResponse.json({ meeting });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const denied = await authorizeMeeting(request, meetingId);
  if (denied) return denied;
  const registrations = await listRegistrationsByMeeting(meetingId);

  if (registrations.length > 0) {
    return NextResponse.json(
      { message: "该会议已有报名或签到数据，不能删除；可将会议状态改为已归档。" },
      { status: 409 },
    );
  }

  const deleted = await deleteOutreachMeeting(meetingId);

  if (!deleted) {
    return NextResponse.json({ message: "未找到会议。" }, { status: 404 });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  revalidatePath(`/admin/outreach-meetings/${meetingId}`);
  return NextResponse.json({ ok: true });
}
