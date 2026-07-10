import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { listRegistrationsByMeeting } from "@/lib/registrations-store";
import {
  buildWecomMeetingStats,
  notifyWecomCheckinSummary,
} from "@/lib/wecom-notifier";
import {
  readWecomCheckinSummaryState,
  writeWecomCheckinSummaryState,
} from "@/lib/wecom-checkin-summary-state";
import type { OutreachMeeting } from "@/lib/types";

const scanIntervalMs = 60 * 1000;
const windowBeforeStartMs = 60 * 60 * 1000;
const windowAfterStartMs = 30 * 60 * 1000;

declare global {
  var __wecomCheckinSummaryJobStarted: boolean | undefined;
}

function isEligibleMeeting(meeting: OutreachMeeting) {
  return Boolean(
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

export function startWecomCheckinSummaryJob() {
  if (globalThis.__wecomCheckinSummaryJobStarted) {
    return;
  }

  globalThis.__wecomCheckinSummaryJobStarted = true;

  void runWecomCheckinSummaryJobOnce().catch((error) => {
    console.error("企业微信签到进度汇总任务启动执行失败", error);
  });

  const timer = setInterval(() => {
    void runWecomCheckinSummaryJobOnce().catch((error) => {
      console.error("企业微信签到进度汇总任务执行失败", error);
    });
  }, scanIntervalMs);
  timer.unref?.();
}
