import { NextResponse } from "next/server";
import { parseExternalForumFormValues } from "@/lib/admin-form-request";
import {
  createExternalForum,
  readExternalForums,
} from "@/lib/external-forums-store";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope, resolveWriteOwner } from "@/lib/admin-access";
import { readAdminFormAllowedValues } from "@/lib/admin-form-options";

export async function GET(request: Request) {
  const auth = await authorizeAdminRequest("external_forums");
  if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);
  if (!scope) return NextResponse.json({ message: "无权查看该账号数据" }, { status: 403 });
  const records = (await readExternalForums()).filter((item) => recordInScope(item.ownerUserId, scope));
  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest("external_forums");
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const parsed = parseExternalForumFormValues(body, await readAdminFormAllowedValues());

  if (!parsed.values) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const ownerUserId = await resolveWriteOwner(auth.user, request, body);
  if (!ownerUserId) return NextResponse.json({ message: "请选择有效的数据归属账号" }, { status: 400 });
  const record = await createExternalForum(parsed.values, ownerUserId);
  return NextResponse.json({ record });
}
