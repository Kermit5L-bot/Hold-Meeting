import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const maxFileSize = 3 * 1024 * 1024;
const uploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "outreach-covers",
);

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function createFileName(extension: string) {
  const random = Math.random().toString(36).slice(2, 10);
  return `cover-${Date.now().toString(36)}-${random}.${extension}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请选择要上传的会议头图。" }, { status: 400 });
  }

  const extension = allowedTypes.get(file.type);

  if (!extension) {
    return NextResponse.json(
      { message: "会议头图仅支持 JPG、PNG、WEBP 格式。" },
      { status: 400 },
    );
  }

  if (file.size > maxFileSize) {
    return NextResponse.json(
      { message: "会议头图大小不能超过 3MB。" },
      { status: 400 },
    );
  }

  await mkdir(uploadDir, { recursive: true });

  const fileName = createFileName(extension);
  const filePath = path.join(uploadDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(filePath, buffer);

  return NextResponse.json({
    url: `/uploads/outreach-covers/${fileName}`,
  });
}
