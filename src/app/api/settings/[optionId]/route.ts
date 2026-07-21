import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import {
  deleteSettingsOption,
  readSettingsOptions,
  updateSettingsOption,
} from "@/lib/settings-store";
import { readSettingsOptionReferenceCount } from "@/lib/settings-usage";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ optionId: string }> },
) {
  const auth = await authorizeAdminRequest(undefined, true); if ("response" in auth) return auth.response;
  const { optionId } = await params;
  const input = await request.json().catch(() => null);

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ message: "提交数据格式无效。" }, { status: 400 });
  }

  const body = input as Record<string, unknown>;
  const label =
    body.label === undefined
      ? undefined
      : typeof body.label === "string"
        ? body.label.trim()
        : null;
  const enabled =
    body.enabled === undefined
      ? undefined
      : typeof body.enabled === "boolean"
        ? body.enabled
        : null;
  const sortOrder =
    body.sortOrder === undefined
      ? undefined
      : typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? body.sortOrder
        : null;

  if (
    label === null ||
    label === "" ||
    (label?.length ?? 0) > 100 ||
    enabled === null ||
    sortOrder === null
  ) {
    return NextResponse.json({ message: "配置项参数无效。" }, { status: 400 });
  }

  if (label === undefined && enabled === undefined && sortOrder === undefined) {
    return NextResponse.json({ message: "没有可更新的配置项。" }, { status: 400 });
  }

  let option;

  try {
    option = await updateSettingsOption(optionId, {
      label,
      enabled,
      sortOrder,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 },
    );
  }

  if (!option) {
    return NextResponse.json({ message: "配置项不存在。" }, { status: 404 });
  }

  return NextResponse.json({ option });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ optionId: string }> },
) {
  const auth = await authorizeAdminRequest(undefined, true); if ("response" in auth) return auth.response;
  const { optionId } = await params;

  try {
    const option = (await readSettingsOptions()).find((item) => item.id === optionId);
    if (!option) {
      return NextResponse.json({ message: "配置项不存在。" }, { status: 404 });
    }
    const referenceCount = await readSettingsOptionReferenceCount(option);
    if (referenceCount > 0) {
      return NextResponse.json(
        { message: `该配置项已被 ${referenceCount} 条业务数据引用，不能删除；如不再使用请将其停用。` },
        { status: 409 },
      );
    }
    const deleted = await deleteSettingsOption(optionId);

    if (!deleted) {
      return NextResponse.json({ message: "配置项不存在。" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "删除失败。" },
      { status: 400 },
    );
  }
}
