import { NextResponse } from "next/server";
import {
  appendImportedExternalForums,
} from "@/lib/external-forums-store";
import {
  appendImportedMarketingMeetings,
} from "@/lib/marketing-meetings-store";
import {
  appendImportedOutreachMeetings,
} from "@/lib/outreach-meetings-store";
import {
  appendImportedRegistrations,
} from "@/lib/registrations-store";
import {
  buildImportTemplate,
  buildRecords,
  type ImportKind,
  previewImport,
} from "@/lib/csv-import";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
} from "@/lib/types";

const templateFileNames: Record<ImportKind, string> = {
  "outreach-meetings": "外联会议主表导入模板.csv",
  "outreach-registrations": "外联会议报名签到明细导入模板.csv",
  "external-forums": "外部会议论坛导入模板.csv",
  "marketing-meetings": "营销中心会议导入模板.csv",
};

async function getCsvFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { csv?: unknown }
    | null;

  return typeof body?.csv === "string" ? body.csv : "";
}

export function templateResponse(kind: ImportKind) {
  const csv = buildImportTemplate(kind);
  const fileName = encodeURIComponent(templateFileNames[kind]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
    },
  });
}

export async function previewResponse(kind: ImportKind, request: Request) {
  const csv = await getCsvFromRequest(request);

  if (!csv.trim()) {
    return NextResponse.json({ message: "请上传 CSV 文件。" }, { status: 400 });
  }

  return NextResponse.json(await previewImport(kind, csv));
}

export async function confirmResponse(kind: ImportKind, request: Request) {
  const csv = await getCsvFromRequest(request);

  if (!csv.trim()) {
    return NextResponse.json({ message: "请上传 CSV 文件。" }, { status: 400 });
  }

  const result = await buildRecords(kind, csv);

  if (kind === "outreach-meetings") {
    await appendImportedOutreachMeetings(result.records as OutreachMeeting[]);
  } else if (kind === "outreach-registrations") {
    await appendImportedRegistrations(result.records as Registration[]);
  } else if (kind === "external-forums") {
    await appendImportedExternalForums(result.records as ExternalForumRecord[]);
  } else {
    await appendImportedMarketingMeetings(result.records as MarketingMeetingRecord[]);
  }

  return NextResponse.json({
    totalRows: result.totalRows,
    validRows: result.records.length,
    importedRows: result.records.length,
    errorRows: result.errorRows,
    duplicateRows: result.duplicateRows,
  });
}
