import { NextResponse } from "next/server";
import {
  createMarketingMeeting,
  readMarketingMeetings,
} from "@/lib/marketing-meetings-store";
import type { MarketingMeetingFormValues } from "@/lib/types";

function validate(values: MarketingMeetingFormValues) {
  if (!values.title.trim()) return "请填写会议主题。";
  if (!values.businessUnit.trim()) return "请填写所属部门。";
  if (!values.attendeesText.trim()) return "请填写参会人。";
  if (!values.meetingTime.trim()) return "请选择会议时间。";
  if (values.locationType === "online" && !values.onlineUrl.trim()) {
    return "请填写线上会议链接。";
  }
  if (values.locationType === "offline" && !values.offlineAddress.trim()) {
    return "请填写线下会议地址。";
  }
  return null;
}

export async function GET() {
  const records = await readMarketingMeetings();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const values = (await request.json()) as MarketingMeetingFormValues;
  const error = validate(values);

  if (error) {
    return NextResponse.json({ message: error }, { status: 400 });
  }

  const record = await createMarketingMeeting(values);
  return NextResponse.json({ record });
}
