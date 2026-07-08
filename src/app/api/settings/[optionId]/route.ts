import { NextResponse } from "next/server";
import {
  deleteSettingsOption,
  updateSettingsOption,
} from "@/lib/settings-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ optionId: string }> },
) {
  const { optionId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { label?: string; enabled?: boolean; sortOrder?: number }
    | null;
  const option = await updateSettingsOption(optionId, {
    label: body?.label,
    enabled: body?.enabled,
    sortOrder: body?.sortOrder,
  });

  if (!option) {
    return NextResponse.json({ message: "配置项不存在。" }, { status: 404 });
  }

  return NextResponse.json({ option });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ optionId: string }> },
) {
  const { optionId } = await params;

  try {
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
