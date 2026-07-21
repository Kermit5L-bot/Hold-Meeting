import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  claimDueWecomNotificationJobs,
  completeWecomNotificationJob,
  failWecomNotificationJob,
  findRegistrationById,
  listRegistrationsByMeeting,
  type WecomNotificationJob,
} from "@/lib/registrations-store";
import {
  buildWecomMeetingStats,
  notifyWecomRegistration,
  notifyWecomWalkInCheckin,
  type WecomMeetingStats,
} from "@/lib/wecom-notifier";

const scanIntervalMs = 15_000;
const maxAttempts = 5;
const retryDelaysMs = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];

declare global {
  var __wecomNotificationJobStarted: boolean | undefined;
  var __wecomNotificationJobRunning: boolean | undefined;
}

export function getWecomNotificationRetryDelayMs(attemptCount: number) {
  const index = Math.max(0, Math.min(retryDelaysMs.length - 1, attemptCount - 1));
  return retryDelaysMs[index];
}

async function buildStats(meetingId: string, registrationId: string) {
  try {
    return buildWecomMeetingStats(await listRegistrationsByMeeting(meetingId));
  } catch (error) {
    console.error("读取企业微信通知统计失败", {
      meetingId,
      registrationId,
      error,
    });
    return undefined;
  }
}

async function processJob(job: WecomNotificationJob) {
  const [meeting, registration] = await Promise.all([
    findOutreachMeeting(job.meetingId),
    findRegistrationById(job.registrationId),
  ]);

  if (!meeting || !registration || registration.status !== "registered") {
    await completeWecomNotificationJob(job, false);
    return;
  }

  const stats: WecomMeetingStats | undefined = await buildStats(
    job.meetingId,
    job.registrationId,
  );
  const result =
    job.kind === "walk_in_checkin"
      ? await notifyWecomWalkInCheckin(meeting, registration, stats)
      : await notifyWecomRegistration(meeting, registration, stats);

  if ("skipped" in result && result.skipped) {
    await completeWecomNotificationJob(job, false);
    return;
  }

  if (result.ok) {
    await completeWecomNotificationJob(job, true);
    return;
  }

  const error = result.error ?? "企业微信通知发送失败";
  const nextAttemptAt =
    job.attemptCount >= maxAttempts
      ? null
      : new Date(Date.now() + getWecomNotificationRetryDelayMs(job.attemptCount));

  await failWecomNotificationJob(job, error, nextAttemptAt);
  console.error("企业微信通知任务发送失败", {
    jobId: job.id,
    meetingId: job.meetingId,
    registrationId: job.registrationId,
    attemptCount: job.attemptCount,
    willRetry: Boolean(nextAttemptAt),
    error,
  });
}

export async function runWecomNotificationJobOnce() {
  while (true) {
    const jobs = await claimDueWecomNotificationJobs();
    if (jobs.length === 0) {
      return;
    }

    for (const job of jobs) {
      try {
        await processJob(job);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "企业微信通知任务执行失败";
        const nextAttemptAt =
          job.attemptCount >= maxAttempts
            ? null
            : new Date(
                Date.now() + getWecomNotificationRetryDelayMs(job.attemptCount),
              );

        try {
          await failWecomNotificationJob(job, message, nextAttemptAt);
        } catch (persistError) {
          console.error("企业微信通知任务失败状态写入失败", {
            jobId: job.id,
            error: persistError,
          });
        }

        console.error("企业微信通知任务处理失败", {
          jobId: job.id,
          error,
        });
      }
    }
  }
}

export async function wakeWecomNotificationJob() {
  if (globalThis.__wecomNotificationJobRunning) {
    return;
  }

  globalThis.__wecomNotificationJobRunning = true;
  try {
    await runWecomNotificationJobOnce();
  } finally {
    globalThis.__wecomNotificationJobRunning = false;
  }
}

export function startWecomNotificationJob() {
  if (globalThis.__wecomNotificationJobStarted) {
    return;
  }

  globalThis.__wecomNotificationJobStarted = true;
  void wakeWecomNotificationJob().catch((error) => {
    console.error("企业微信通知任务启动执行失败", error);
  });

  const timer = setInterval(() => {
    void wakeWecomNotificationJob().catch((error) => {
      console.error("企业微信通知任务执行失败", error);
    });
  }, scanIntervalMs);
  timer.unref?.();
}
