import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { authorizeAdminRequest } from "@/lib/admin-access";

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
  return `cover-${randomUUID()}.${extension}`;
}

function hasValidImageSignature(buffer: Buffer, extension: string) {
  if (extension === "jpg") {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }

  if (extension === "png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export async function POST(request: Request) {
  const auth = await authorizeAdminRequest("outreach_meetings"); if ("response" in auth) return auth.response;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

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

  if (file.size === 0) {
    return NextResponse.json(
      { message: "会议头图文件不能为空。" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!hasValidImageSignature(buffer, extension)) {
    return NextResponse.json(
      { message: "文件内容与图片格式不一致，请重新选择有效图片。" },
      { status: 400 },
    );
  }

  const fileName = createFileName(extension);
  const filePath = path.join(uploadDir, fileName);

  try {
    await mkdir(uploadDir, { recursive: true });
    await writeFile(filePath, buffer, { flag: "wx" });
  } catch (error) {
    console.error("保存会议头图失败", { fileName, error });
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    const message =
      code === "ENOSPC"
        ? "服务器存储空间不足，会议头图保存失败，请联系运维处理。"
        : "会议头图保存失败，请联系运维检查上传目录权限和磁盘状态。";

    return NextResponse.json({ message }, { status: 500 });
  }

  return NextResponse.json({
    url: `/uploads/outreach-covers/${fileName}`,
  });
}
