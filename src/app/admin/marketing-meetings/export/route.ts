import { NextResponse } from "next/server";
import { locationTypeLabels } from "@/lib/meeting-options";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readSettingsLabelMap } from "@/lib/settings-options";
import { buildCsv } from "@/lib/spreadsheet-export";
import { getAppDateStamp } from "@/lib/utils";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";

export async function GET(request: Request) {
  const auth = await authorizeAdminRequest("marketing_meetings"); if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request); if (!scope) return NextResponse.json({ message: "无权导出该账号数据" }, { status: 403 });
  const [allRecords, meetingTypeLabels] = await Promise.all([
    readMarketingMeetings(),
    readSettingsLabelMap("marketingMeetingType"),
  ]);
  const records = allRecords.filter((item) => recordInScope(item.ownerUserId, scope));
  const rows: Array<Array<string | number | undefined>> = [
    [
      "会议主题",
      "所属部门",
      "参会人",
      "会议时间",
      "会议地点类型",
      "线上会议链接",
      "线下会议地址",
      "会议类型",
      "会议结论",
      "后续事项",
      "备注",
      "创建时间",
      "更新时间",
    ],
    ...records.map((record) => [
      record.title,
      record.businessUnit,
      record.attendees.join("、"),
      record.meetingTime,
      locationTypeLabels[record.locationType],
      record.onlineUrl ?? "",
      record.offlineAddress ?? "",
      record.meetingType
        ? meetingTypeLabels[record.meetingType] ?? record.meetingType
        : "",
      record.conclusion ?? "",
      record.followUp ?? "",
      record.notes ?? "",
      record.createdAt,
      record.updatedAt,
    ]),
  ];
  const fileName = encodeURIComponent(
    `营销中心会议台账_${getAppDateStamp()}.csv`,
  );

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
