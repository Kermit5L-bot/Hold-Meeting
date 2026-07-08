import { NextResponse } from "next/server";
import {
  createSettingsOption,
  readSettingsOptions,
} from "@/lib/settings-store";
import type { SettingsCategory } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ options: await readSettingsOptions() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { category?: SettingsCategory; label?: string }
    | null;

  if (!body?.category || !body.label?.trim()) {
    return NextResponse.json({ message: "请填写配置类型和名称。" }, { status: 400 });
  }

  try {
    const option = await createSettingsOption({
      category: body.category,
      label: body.label,
    });

    return NextResponse.json({ option });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "保存失败。" },
      { status: 400 },
    );
  }
}
