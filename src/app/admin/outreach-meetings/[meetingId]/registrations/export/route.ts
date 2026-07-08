import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  mealPreferenceLabels,
  organizationTypeLabels,
  registrationSourceLabels,
  registrationStatusLabels,
} from "@/lib/registration-options";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import type { OrganizationType } from "@/lib/types";

function csvCell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function organizationLabel(
  organizationType: OrganizationType,
  otherOrganizationType?: string,
) {
  return organizationType === "other"
    ? otherOrganizationType || "其他"
    : organizationTypeLabels[organizationType];
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
      meeting?.title ?? "",
      registration.name,
      organizationLabel(
        registration.organizationType,
        registration.otherOrganizationType,
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
  const csv = `\uFEFF${rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\n")}`;
  const fileName = encodeURIComponent(
    `${meeting?.title ?? "外联会议"}_报名数据_${new Date()
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
