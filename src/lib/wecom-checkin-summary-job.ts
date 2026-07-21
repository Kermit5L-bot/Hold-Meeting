import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import {
  buildWecomMeetingStats,
  notifyWecomCheckinSummary,
  type WecomMeetingStats,
} from "@/lib/wecom-notifier";
import {
  readWecomCheckinSummaryState,
  type WecomCheckinSummaryState,
  writeWecomCheckinSummaryState,
} from "@/lib/wecom-checkin-summary-state";
import type { OutreachMeeting } from "@/lib/types";

const scanIntervalMs = 60 * 1000;
const windowBeforeStartMs = 60 * 60 * 1000;
const windowAfterStartMs = 30 * 60 * 1000;

declare global {
  var __wecomCheckinSummaryJobStarted: boolean | undefined;
  var __wecomCheckinSummaryJobRunning: boolean | undefined;
}

function isEligibleMeeting(meeting: OutreachMeeting) {
  return Boolean(
    meeting.status === "published" &&
      meeting.enableWecomNotify &&
      meeting.wecomWebhook?.trim() &&
      meeting.enableWecomCheckinSummaryNotify,
  );
}

function isInsideSummaryWindow(meeting: OutreachMeeting, now: Date) {
  const startTime = new Date(meeting.startTime);
  const startMs = startTime.getTime();

  if (Number.isNaN(startMs)) {
    return false;
  }

  const nowMs = now.getTime();
  return (
    nowMs >= startMs - windowBeforeStartMs &&
    nowMs <= startMs + windowAfterStartMs
  );
}

function hasReachedInterval(lastSentAt: string | undefined, intervalMinutes: number, now: Date) {
  if (!lastSentAt) {
    return true;
  }

  const lastSentMs = new Date(lastSentAt).getTime();

  if (Number.isNaN(lastSentMs)) {
    return true;
  }

  return now.getTime() - lastSentMs >= intervalMinutes * 60 * 1000;
}

export function hasCompletedCheckinSummary(
  state: WecomCheckinSummaryState | null,
  stats: WecomMeetingStats,
) {
  if (state?.completedAt) return true;
  return Boolean(
    state &&
      stats.registrationCount > 0 &&
      stats.checkinCount >= stats.registrationCount &&
      state.lastRegistrationCount === stats.registrationCount &&
      state.lastCheckinCount === stats.checkinCount,
  );
}

async function maybeSendMeetingSummary(meeting: OutreachMeeting, now: Date) {
  if (!isEligibleMeeting(meeting) || !isInsideSummaryWindow(meeting, now)) {
    return;
  }

  const registrations = await listRegistrationsByMeeting(meeting.id);
  const stats = buildWecomMeetingStats(registrations);

  if (stats.registrationCount === 0 || stats.checkinCount === 0) {
    return;
  }

  const state = await readWecomCheckinSummaryState(meeting.id);

  if (hasCompletedCheckinSummary(state, stats)) {
    if (state && !state.completedAt) {
      await writeWecomCheckinSummaryState({
        ...state,
        completedAt: state.lastSentAt,
      });
    }
    return;
  }

  if (!hasReachedInterval(state?.lastSentAt, meeting.wecomCheckinSummaryIntervalMinutes, now)) {
    return;
  }

  if (state && state.lastCheckinCount === stats.checkinCount) {
    return;
  }

  const result = await notifyWecomCheckinSummary(meeting, stats, now);

  if ("skipped" in result && result.skipped) {
    return;
  }

  if (!result.ok) {
    console.error("企业微信签到进度汇总发送失败", {
      meetingId: meeting.id,
      error: result.error,
    });
    return;
  }

  await writeWecomCheckinSummaryState({
    meetingId: meeting.id,
    lastSentAt: now.toISOString(),
    lastCheckinCount: stats.checkinCount,
    lastRegistrationCount: stats.registrationCount,
    lastNotCheckedInCount: stats.notCheckedInCount,
    completedAt:
      stats.registrationCount > 0 && stats.checkinCount >= stats.registrationCount
        ? now.toISOString()
        : undefined,
  });
}

export async function runWecomCheckinSummaryJobOnce(now = new Date()) {
  const meetings = await readOutreachMeetings();

  for (const meeting of meetings) {
    try {
      await maybeSendMeetingSummary(meeting, now);
    } catch (error) {
      console.error("企业微信签到进度汇总任务处理失败", {
        meetingId: meeting.id,
        error,
      });
    }
  }
}

async function runScheduledJob() {
  if (globalThis.__wecomCheckinSummaryJobRunning) {
    return;
  }

  globalThis.__wecomCheckinSummaryJobRunning = true;
  try {
    await runWecomCheckinSummaryJobOnce();
  } finally {
    globalThis.__wecomCheckinSummaryJobRunning = false;
  }
}

export function startWecomCheckinSummaryJob() {
  if (globalThis.__wecomCheckinSummaryJobStarted) {
    return;
  }

  globalThis.__wecomCheckinSummaryJobStarted = true;

  void runScheduledJob().catch((error) => {
    console.error("企业微信签到进度汇总任务启动执行失败", error);
  });

  const timer = setInterval(() => {
    void runScheduledJob().catch((error) => {
      console.error("企业微信签到进度汇总任务执行失败", error);
    });
  }, scanIntervalMs);
  timer.unref?.();
}
