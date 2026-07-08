import { NextResponse } from "next/server";
import {
  createExternalForum,
  readExternalForums,
} from "@/lib/external-forums-store";
import type { ExternalForumFormValues } from "@/lib/types";

function validate(values: ExternalForumFormValues) {
  if (!values.title.trim()) return "请填写会议主题。";
  if (!values.organizer.trim()) return "请填写主办单位。";
  if (!values.meetingTime.trim()) return "请选择会议时间。";
  if (!values.location.trim()) return "请填写会议地点。";
  if (!values.attendeesText.trim()) return "请填写参会人。";
  if (!values.businessUnit.trim()) return "请填写所属部门。";
  if (values.hasSpeech === "yes") {
    if (!values.speechTopic.trim()) return "请填写演讲题目。";
    if (!values.speaker.trim()) return "请填写演讲人。";
  }
  if (values.sponsored === "yes" && !values.sponsorshipType.trim()) {
    return "请填写赞助形式。";
  }
  return null;
}

export async function GET() {
  const records = await readExternalForums();
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const values = (await request.json()) as ExternalForumFormValues;
  const error = validate(values);

  if (error) {
    return NextResponse.json({ message: error }, { status: 400 });
  }

  const record = await createExternalForum(values);
  return NextResponse.json({ record });
}
