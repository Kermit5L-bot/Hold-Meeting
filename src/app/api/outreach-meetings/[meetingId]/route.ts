import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  deleteOutreachMeeting,
  updateOutreachMeeting,
} from "@/lib/outreach-meetings-store";
import type { MeetingFormValues } from "@/lib/types";

function validate(values: MeetingFormValues) {
  if (!values.title.trim()) return "请填写会议主题。";
  if (!values.startTime.trim()) return "请选择会议开始时间。";
  if (!values.location.trim()) return "请填写会议地点。";
  if (values.enableWecomNotify && !values.wecomWebhook.trim()) {
    return "开启企业微信通知后，请填写企业微信机器人 Webhook。";
  }
  if (![10, 15, 30].includes(values.wecomCheckinSummaryIntervalMinutes ?? 15)) {
    return "请选择有效的签到汇总频率。";
  }
  return null;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const values = (await request.json()) as MeetingFormValues;
  const error = validate(values);

  if (error) {
    return NextResponse.json({ message: error }, { status: 400 });
  }

  const meeting = await updateOutreachMeeting(meetingId, values);

  if (!meeting) {
    return NextResponse.json({ message: "未找到会议。" }, { status: 404 });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  revalidatePath(`/admin/outreach-meetings/${meetingId}`);
  return NextResponse.json({ meeting });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  await deleteOutreachMeeting(meetingId);
  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  revalidatePath(`/admin/outreach-meetings/${meetingId}`);
  return NextResponse.json({ ok: true });
}
