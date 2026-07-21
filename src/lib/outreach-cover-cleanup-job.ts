import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";

const cleanupIntervalMs = 24 * 60 * 60 * 1000;
const orphanMinimumAgeMs = 24 * 60 * 60 * 1000;
const generatedCoverPattern = /^cover-[A-Za-z0-9-]+\.(?:jpe?g|png|webp)$/i;
const uploadDir = path.join(
  process.cwd(),
  "public",
  "uploads",
  "outreach-covers",
);

declare global {
  var __outreachCoverCleanupJobStarted: boolean | undefined;
  var __outreachCoverCleanupJobRunning: boolean | undefined;
}

function coverFileName(coverImageUrl: string | undefined) {
  const prefix = "/uploads/outreach-covers/";
  return coverImageUrl?.startsWith(prefix)
    ? path.basename(coverImageUrl.slice(prefix.length))
    : null;
}

export async function cleanupOrphanedOutreachCovers(
  now = new Date(),
  options?: {
    uploadDirectory?: string;
    referencedCoverUrls?: string[];
  },
) {
  const coverUrls =
    options?.referencedCoverUrls ??
    (await readOutreachMeetings()).map((meeting) => meeting.coverImageUrl ?? "");
  const referencedFiles = new Set(
    coverUrls
      .map((coverUrl) => coverFileName(coverUrl))
      .filter((fileName): fileName is string => Boolean(fileName)),
  );
  const targetDirectory = options?.uploadDirectory ?? uploadDir;

  let entries;
  try {
    entries = await readdir(targetDirectory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return 0;
    }
    throw error;
  }

  let deletedCount = 0;
  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !generatedCoverPattern.test(entry.name) ||
      referencedFiles.has(entry.name)
    ) {
      continue;
    }

    const filePath = path.join(targetDirectory, entry.name);
    try {
      const fileStat = await stat(filePath);
      if (now.getTime() - fileStat.mtimeMs < orphanMinimumAgeMs) {
        continue;
      }
      await unlink(filePath);
      deletedCount += 1;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        console.error("清理未使用会议头图失败", { fileName: entry.name, error });
      }
    }
  }

  return deletedCount;
}

async function runCleanup() {
  if (globalThis.__outreachCoverCleanupJobRunning) {
    return;
  }

  globalThis.__outreachCoverCleanupJobRunning = true;
  try {
    const deletedCount = await cleanupOrphanedOutreachCovers();
    if (deletedCount > 0) {
      console.info(`已清理 ${deletedCount} 张未使用的会议头图。`);
    }
  } finally {
    globalThis.__outreachCoverCleanupJobRunning = false;
  }
}

export function startOutreachCoverCleanupJob() {
  if (globalThis.__outreachCoverCleanupJobStarted) {
    return;
  }

  globalThis.__outreachCoverCleanupJobStarted = true;
  void runCleanup().catch((error) => {
    console.error("会议头图清理任务启动执行失败", error);
  });

  const timer = setInterval(() => {
    void runCleanup().catch((error) => {
      console.error("会议头图清理任务执行失败", error);
    });
  }, cleanupIntervalMs);
  timer.unref?.();
}
