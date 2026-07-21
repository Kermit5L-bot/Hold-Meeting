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
import { authorizeAdminRequest, resolveWriteOwner } from "@/lib/admin-access";
import type { AdminModule } from "@/lib/types";

const templateFileNames: Record<ImportKind, string> = {
  "outreach-meetings": "外联会议主表导入模板.csv",
  "outreach-registrations": "外联会议报名签到明细导入模板.csv",
  "external-forums": "外部会议论坛导入模板.csv",
  "marketing-meetings": "营销中心会议导入模板.csv",
};

const maxCsvBytes = 2 * 1024 * 1024;

async function getCsvFromRequest(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { csv?: unknown; ownerUserId?: unknown }
    | null;

  const csv = typeof body?.csv === "string" ? body.csv : "";
  return {
    csv,
    tooLarge: new TextEncoder().encode(csv).byteLength > maxCsvBytes,
    body: body as Record<string, unknown> | null,
  };
}

export function templateResponse(kind: ImportKind) {
  const csv = buildImportTemplate(kind);
  const fileName = encodeURIComponent(templateFileNames[kind]);

  return new NextResponse(csv, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${fileName}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function importFailureResponse(action: "校验" | "导入", error: unknown) {
  console.error(`CSV ${action}失败`, error);
  const errorMessage = error instanceof Error ? error.message : "";

  if (/(重新预览|已存在)/.test(errorMessage)) {
    return NextResponse.json({ message: errorMessage }, { status: 409 });
  }

  if (/(database is locked|SQLITE_BUSY)/i.test(errorMessage)) {
    return NextResponse.json(
      { message: `${action}失败：服务器数据正忙，请稍后重新预览并导入。` },
      { status: 503 },
    );
  }

  const message = /(EACCES|EPERM|ENOENT|EROFS|permission|access denied)/i.test(
    errorMessage,
  )
    ? `${action}失败：服务器数据目录不可读写，请联系运维检查数据目录权限。`
    : /(历史.*数据文件|数据库集合).*(解析失败|格式无效|无法解析)/.test(
          errorMessage,
        )
      ? `${action}失败：服务器历史数据异常，系统已停止写入以保护数据，请联系运维检查日志。`
      : `${action}失败：请确认文件为 CSV UTF-8 格式，并使用最新模板。`;

  return NextResponse.json({ message }, { status: 500 });
}

export async function previewResponse(kind: ImportKind, request: Request) {
  const moduleByKind: Record<ImportKind, AdminModule> = { "outreach-meetings": "outreach_meetings", "outreach-registrations": "outreach_meetings", "external-forums": "external_forums", "marketing-meetings": "marketing_meetings" };
  const auth = await authorizeAdminRequest(moduleByKind[kind]);
  if ("response" in auth) return auth.response;
  const { csv, tooLarge, body } = await getCsvFromRequest(request);
  const ownerUserId = await resolveWriteOwner(auth.user, request, body);
  if (!ownerUserId) return NextResponse.json({ message: "请选择有效的数据归属账号" }, { status: 400 });

  if (tooLarge) {
    return NextResponse.json(
      { message: "CSV 文件不能超过 2MB。" },
      { status: 413 },
    );
  }

  if (!csv.trim()) {
    return NextResponse.json({ message: "请上传 CSV 文件。" }, { status: 400 });
  }

  try {
    return NextResponse.json(await previewImport(kind, csv, ownerUserId));
  } catch (error) {
    return importFailureResponse("校验", error);
  }
}

export async function confirmResponse(kind: ImportKind, request: Request) {
  const moduleByKind: Record<ImportKind, AdminModule> = { "outreach-meetings": "outreach_meetings", "outreach-registrations": "outreach_meetings", "external-forums": "external_forums", "marketing-meetings": "marketing_meetings" };
  const auth = await authorizeAdminRequest(moduleByKind[kind]);
  if ("response" in auth) return auth.response;
  const { csv, tooLarge, body } = await getCsvFromRequest(request);
  const ownerUserId = await resolveWriteOwner(auth.user, request, body);
  if (!ownerUserId) return NextResponse.json({ message: "请选择有效的数据归属账号" }, { status: 400 });

  if (tooLarge) {
    return NextResponse.json(
      { message: "CSV 文件不能超过 2MB。" },
      { status: 413 },
    );
  }

  if (!csv.trim()) {
    return NextResponse.json({ message: "请上传 CSV 文件。" }, { status: 400 });
  }

  try {
    const result = await buildRecords(kind, csv, ownerUserId);

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
  } catch (error) {
    return importFailureResponse("导入", error);
  }
}
