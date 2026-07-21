import { NextResponse } from "next/server";
import { readExternalForums } from "@/lib/external-forums-store";
import { readSettingsLabelMap } from "@/lib/settings-options";
import { buildCsv } from "@/lib/spreadsheet-export";
import { getAppDateStamp } from "@/lib/utils";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";

export async function GET(request: Request) {
  const auth = await authorizeAdminRequest("external_forums"); if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request); if (!scope) return NextResponse.json({ message: "无权导出该账号数据" }, { status: 403 });
  const [allRecords, costTypeLabels, attendancePurposeLabels, meetingOutputLabels] =
    await Promise.all([
      readExternalForums(),
      readSettingsLabelMap("costType"),
      readSettingsLabelMap("attendancePurpose"),
      readSettingsLabelMap("meetingOutput"),
    ]);
  const records = allRecords.filter((item) => recordInScope(item.ownerUserId, scope));
  const rows: Array<Array<string | number | undefined>> = [
    [
      "会议主题",
      "主办单位",
      "会议时间",
      "会议地点",
      "参会人",
      "是否演讲",
      "演讲题目",
      "演讲人",
      "费用",
      "费用类型",
      "所属部门",
      "是否赞助",
      "赞助形式",
      "参会目的",
      "会议产出",
      "后续跟进事项",
      "备注",
      "创建时间",
      "更新时间",
    ],
    ...records.map((record) => [
      record.title,
      record.organizer,
      record.meetingTime,
      record.location,
      record.attendees.join("、"),
      record.hasSpeech ? "是" : "否",
      record.speechTopic ?? "",
      record.speaker ?? "",
      record.cost ?? "",
      record.costType ? costTypeLabels[record.costType] ?? record.costType : "",
      record.businessUnit,
      record.sponsored ? "是" : "否",
      record.sponsorshipType ?? "",
      record.purposes
        .map((purpose) => attendancePurposeLabels[purpose] ?? purpose)
        .join("、"),
      record.outputs
        .map((output) => meetingOutputLabels[output] ?? output)
        .join("、"),
      record.followUp ?? "",
      record.notes ?? "",
      record.createdAt,
      record.updatedAt,
    ]),
  ];
  const fileName = encodeURIComponent(
    `外部会议论坛台账_${getAppDateStamp()}.csv`,
  );

  return new NextResponse(buildCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
