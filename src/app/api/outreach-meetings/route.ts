import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  createOutreachMeeting,
  readOutreachMeetings,
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

export async function GET() {
  const meetings = await readOutreachMeetings();
  return NextResponse.json({ meetings });
}

export async function POST(request: Request) {
  const values = (await request.json()) as MeetingFormValues;
  const error = validate(values);

  if (error) {
    return NextResponse.json({ message: error }, { status: 400 });
  }

  const meeting = await createOutreachMeeting(values);
  revalidatePath("/admin");
  revalidatePath("/admin/outreach-meetings");
  return NextResponse.json({ meeting });
}
