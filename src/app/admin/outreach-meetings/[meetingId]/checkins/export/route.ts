import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  checkinMethodLabels,
  checkinStatusLabels,
  registrationSourceLabels,
} from "@/lib/registration-options";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);
  const registrations = await listRegistrationsByMeeting(meetingId);
  const rows = [
    [
      "报名ID",
      "会议ID",
      "会议名称",
      "姓名",
      "单位名称",
      "手机号",
      "签到状态",
      "签到时间",
      "签到方式",
      "是否现场补报名",
      "报名来源",
      "是否重复签到",
    ],
    ...registrations.map((registration) => [
      registration.id,
      registration.meetingId,
      meeting?.title ?? "",
      registration.name,
      registration.organizationName,
      registration.phone,
      checkinStatusLabels[registration.checkinStatus],
      registration.checkinAt ?? "",
      registration.checkinMethod
        ? checkinMethodLabels[registration.checkinMethod]
        : "",
      registration.isWalkIn ? "是" : "否",
      registrationSourceLabels[registration.source],
      "否",
    ]),
  ];
  const csv = `\uFEFF${rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n")}`;
  const fileName = encodeURIComponent(
    `${meeting?.title ?? "外联会议"}_签到数据_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
