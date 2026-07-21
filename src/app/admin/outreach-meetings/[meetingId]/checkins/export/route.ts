import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  checkinMethodLabels,
  checkinStatusLabels,
  registrationSourceLabels,
} from "@/lib/registration-options";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import { buildCsv } from "@/lib/spreadsheet-export";
import { getAppDateStamp } from "@/lib/utils";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);
  const auth = await authorizeAdminRequest("outreach_meetings"); if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);

  if (!meeting || !scope || !recordInScope(meeting.ownerUserId, scope)) {
    return NextResponse.json({ message: "未找到会议。" }, { status: 404 });
  }

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
      meeting.title,
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
  const csv = buildCsv(rows);
  const fileName = encodeURIComponent(
    `${meeting.title}_签到数据_${getAppDateStamp()}.csv`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
