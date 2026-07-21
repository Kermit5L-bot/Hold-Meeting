import { readFile, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const uploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "outreach-covers",
);

const contentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function getSafeFile(fileName: string) {
  if (
    !fileName ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    path.basename(fileName) !== fileName
  ) {
    return null;
  }

  const extension = path.extname(fileName).toLowerCase();
  const contentType = contentTypes.get(extension);

  if (!contentType) {
    return null;
  }

  const filePath = path.join(uploadDir, fileName);

  if (!filePath.startsWith(`${uploadDir}${path.sep}`)) {
    return null;
  }

  return { contentType, filePath };
}

function notFoundResponse() {
  return new Response(null, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function logUnexpectedReadError(fileName: string, error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  if (code !== "ENOENT" && code !== "ENOTDIR") {
    console.error("读取会议头图失败", { fileName, error });
  }
}

async function readCover(fileName: string) {
  const safeFile = getSafeFile(fileName);

  if (!safeFile) {
    return null;
  }

  try {
    const file = await readFile(safeFile.filePath);

    return {
      body: new Uint8Array(file),
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(file.byteLength),
        "Content-Type": safeFile.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    };
  } catch (error) {
    logUnexpectedReadError(fileName, error);
    return null;
  }
}

async function readCoverMetadata(fileName: string) {
  const safeFile = getSafeFile(fileName);

  if (!safeFile) {
    return null;
  }

  try {
    const fileStat = await stat(safeFile.filePath);

    if (!fileStat.isFile()) {
      return null;
    }

    return {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(fileStat.size),
      "Content-Type": safeFile.contentType,
      "X-Content-Type-Options": "nosniff",
    };
  } catch (error) {
    logUnexpectedReadError(fileName, error);
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  const cover = await readCover(fileName);

  if (!cover) {
    return notFoundResponse();
  }

  return new Response(cover.body, {
    headers: cover.headers,
  });
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName } = await params;
  const headers = await readCoverMetadata(fileName);

  if (!headers) {
    return notFoundResponse();
  }

  return new Response(null, {
    headers,
  });
}
