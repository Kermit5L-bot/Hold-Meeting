import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";
import {
  createSettingsOption,
  readSettingsOptions,
  reorderSettingsOptions,
} from "@/lib/settings-store";
import { settingsCategories } from "@/lib/settings-constants";
import type { SettingsCategory } from "@/lib/types";

export async function GET() {
  const auth = await authorizeAdminRequest(undefined, true); if ("response" in auth) return auth.response;
  return NextResponse.json({ options: await readSettingsOptions() });
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest(undefined, true); if ("response" in auth) return auth.response;
  const input = await request.json().catch(() => null);
  const body =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const category = typeof body?.category === "string" ? body.category : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";

  if (!settingsCategories.includes(category as SettingsCategory) || !label) {
    return NextResponse.json({ message: "请填写配置类型和名称。" }, { status: 400 });
  }

  if (label.length > 100) {
    return NextResponse.json({ message: "配置名称不能超过 100 个字符。" }, { status: 400 });
  }

  try {
    const option = await createSettingsOption({
      category: category as SettingsCategory,
      label,
    });

    return NextResponse.json({ option });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 },
    );
  }
}

export async function PUT(request: Request) {
  const input = await request.json().catch(() => null);
  const body =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  const category =
    typeof body?.category === "string" ? body.category : "";
  const rawOrderedIds = body?.orderedIds;
  const orderedIds = Array.isArray(rawOrderedIds)
    ? rawOrderedIds.filter((id): id is string => typeof id === "string")
    : null;

  if (
    !settingsCategories.includes(category as SettingsCategory) ||
    !orderedIds ||
    !Array.isArray(rawOrderedIds) ||
    orderedIds.length !== rawOrderedIds.length
  ) {
    return NextResponse.json({ message: "排序参数无效。" }, { status: 400 });
  }

  try {
    const options = await reorderSettingsOptions(
      category as SettingsCategory,
      orderedIds,
    );

    return NextResponse.json({ options });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "排序保存失败。" },
      { status: 400 },
    );
  }
}
