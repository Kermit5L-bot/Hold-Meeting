import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  mealPreferenceLabels,
  registrationSourceLabels,
  registrationStatusLabels,
} from "@/lib/registration-options";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import { readSettingsLabelMap } from "@/lib/settings-options";
import { buildCsv } from "@/lib/spreadsheet-export";
import type { OrganizationType } from "@/lib/types";
import { getAppDateStamp } from "@/lib/utils";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";

function organizationLabel(
  organizationType: OrganizationType,
  otherOrganizationType?: string,
  labels: Record<string, string> = {},
) {
  return organizationType === "other"
    ? otherOrganizationType || "其他"
    : labels[organizationType] ?? organizationType;
}

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

  const [registrations, organizationTypeLabels] = await Promise.all([
    listRegistrationsByMeeting(meetingId),
    readSettingsLabelMap("organizationType"),
  ]);
  const rows = [
    [
      "报名ID",
      "会议ID",
      "会议名称",
      "姓名",
      "单位类型",
      "单位名称",
      "职位",
      "手机号",
      "是否用餐",
      "报名状态",
      "报名来源",
      "报名时间",
      "创建时间",
      "更新时间",
      "备注",
    ],
    ...registrations.map((registration) => [
      registration.id,
      registration.meetingId,
      meeting.title,
      registration.name,
      organizationLabel(
        registration.organizationType,
        registration.otherOrganizationType,
        organizationTypeLabels,
      ),
      registration.organizationName,
      registration.position ?? "",
      registration.phone,
      mealPreferenceLabels[registration.meal],
      registrationStatusLabels[registration.status],
      registrationSourceLabels[registration.source],
      registration.registeredAt,
      registration.createdAt,
      registration.updatedAt,
      registration.notes ?? "",
    ]),
  ];
  const csv = buildCsv(rows);
  const fileName = encodeURIComponent(
    `${meeting.title}_报名数据_${getAppDateStamp()}.csv`,
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
