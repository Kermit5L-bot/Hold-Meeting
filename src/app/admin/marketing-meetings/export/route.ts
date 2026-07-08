import { NextResponse } from "next/server";
import { locationTypeLabels } from "@/lib/meeting-options";
import { internalMeetingTypeLabels } from "@/lib/marketing-meeting-options";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";

function cell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `<td>${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</td>`;
}

export async function GET() {
  const records = await readMarketingMeetings();
  const rows = records
    .map((record) => {
      const values = [
        record.title,
        record.businessUnit,
        record.attendees.join("、"),
        record.meetingTime,
        locationTypeLabels[record.locationType],
        record.onlineUrl ?? "",
        record.offlineAddress ?? "",
        record.meetingType ? internalMeetingTypeLabels[record.meetingType] : "",
        record.conclusion ?? "",
        record.followUp ?? "",
        record.notes ?? "",
        record.createdAt,
        record.updatedAt,
      ];
      return `<tr>${values.map(cell).join("")}</tr>`;
    })
    .join("");
  const headers = [
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
  ];
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers
    .map((title) => `<th>${title}</th>`)
    .join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const fileName = encodeURIComponent(
    `营销中心会议台账_${new Date().toISOString().slice(0, 10)}.xls`,
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
