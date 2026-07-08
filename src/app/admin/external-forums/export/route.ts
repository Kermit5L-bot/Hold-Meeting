import { NextResponse } from "next/server";
import {
  attendancePurposeLabels,
  costTypeLabels,
  meetingOutputLabels,
} from "@/lib/external-forum-options";
import { readExternalForums } from "@/lib/external-forums-store";

function cell(value: string | number | undefined) {
  const text = String(value ?? "");
  return `<td>${text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</td>`;
}

export async function GET() {
  const records = await readExternalForums();
  const rows = records
    .map((record) => {
      const values = [
        record.title,
        record.organizer,
        record.meetingTime,
        record.location,
        record.attendees.join("、"),
        record.hasSpeech ? "是" : "否",
        record.speechTopic ?? "",
        record.speaker ?? "",
        record.cost ?? "",
        record.costType ? costTypeLabels[record.costType] : "",
        record.businessUnit,
        record.sponsored ? "是" : "否",
        record.sponsorshipType ?? "",
        record.purposes
          .map((purpose) => attendancePurposeLabels[purpose])
          .join("、"),
        record.outputs.map((output) => meetingOutputLabels[output]).join("、"),
        record.followUp ?? "",
        record.notes ?? "",
        record.createdAt,
        record.updatedAt,
      ];
      return `<tr>${values.map(cell).join("")}</tr>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${[
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
  ]
    .map((title) => `<th>${title}</th>`)
    .join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const fileName = encodeURIComponent(
    `外部会议论坛台账_${new Date().toISOString().slice(0, 10)}.xls`,
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}
