import {
  mealPreferenceLabels,
  organizationTypeLabels,
} from "@/lib/registration-options";
import type { OutreachMeeting, Registration } from "@/lib/types";
import { dateFormatter } from "@/lib/utils";

interface NotifyResult {
  ok: boolean;
  error?: string;
}

export interface WecomMeetingStats {
  registrationCount: number;
  checkinCount: number;
  notCheckedInCount: number;
  walkInCount: number;
}

export function buildWecomMeetingStats(registrations: Registration[]): WecomMeetingStats {
  const activeRegistrations = registrations.filter(
    (registration) => registration.status === "registered",
  );
  const checkinCount = activeRegistrations.filter(
    (registration) => registration.checkinStatus === "checked_in",
  ).length;
  const registrationCount = activeRegistrations.length;
  const walkInCount = activeRegistrations.filter(
    (registration) => registration.isWalkIn || registration.source === "walk_in",
  ).length;

  return {
    registrationCount,
    checkinCount,
    notCheckedInCount: Math.max(registrationCount - checkinCount, 0),
    walkInCount,
  };
}

function organizationLabel(registration: Registration) {
  if (registration.organizationType === "other") {
    return registration.otherOrganizationType || "其他";
  }

  return organizationTypeLabels[registration.organizationType];
}

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

function maskPhone(phone: string) {
  const normalized = phone.replace(/\D/g, "");

  if (normalized.length < 7) {
    return normalized;
  }

  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`;
}

function canSendWecomNotify(meeting: OutreachMeeting) {
  return Boolean(meeting.enableWecomNotify && meeting.wecomWebhook?.trim());
}

function registrationTemplate(
  meeting: OutreachMeeting,
  registration: Registration,
  stats?: WecomMeetingStats,
) {
  return `【外联会议报名通知】

会议名称：${meeting.title}
会议时间：${formatDate(meeting.startTime)}
会议地点：${meeting.location}

报名人：${registration.name}
单位类型：${organizationLabel(registration)}
单位名称：${registration.organizationName}
职位：${registration.position ?? "-"}
手机号：${maskPhone(registration.phone)}
是否用餐：${mealPreferenceLabels[registration.meal]}

报名来源：会前报名
报名时间：${formatDate(registration.registeredAt)}
${stats ? `\n当前报名统计：累计报名 ${stats.registrationCount} 人` : ""}

请相关同事及时关注报名情况。`;
}

function walkInTemplate(
  meeting: OutreachMeeting,
  registration: Registration,
  stats?: WecomMeetingStats,
) {
  return `【现场补报名并签到通知】

会议名称：${meeting.title}
会议时间：${formatDate(meeting.startTime)}
会议地点：${meeting.location}

参会人：${registration.name}
单位类型：${organizationLabel(registration)}
单位名称：${registration.organizationName}
职位：${registration.position ?? "-"}
手机号：${maskPhone(registration.phone)}
是否用餐：${mealPreferenceLabels[registration.meal]}

报名来源：现场补报名
签到状态：已签到
签到时间：${formatDate(registration.checkinAt)}
${stats ? `\n当前签到统计：已签到 ${stats.checkinCount} 人，剩余 ${stats.notCheckedInCount} 人未签到` : ""}

该人员未提前报名，已在现场完成补报名和签到。`;
}

function percent(value: number) {
  return `${(value * 100).toFixed(1).replace(/\.0$/, "")}%`;
}

function checkinSummaryTemplate(
  meeting: OutreachMeeting,
  stats: WecomMeetingStats,
  statisticAt: Date,
) {
  const attendanceRate = stats.registrationCount
    ? stats.checkinCount / stats.registrationCount
    : 0;

  return `【外联会议签到进度汇总】

会议名称：${meeting.title}
会议时间：${formatDate(meeting.startTime)}
会议地点：${meeting.location}

累计报名：${stats.registrationCount} 人
已签到：${stats.checkinCount} 人
未签到：${stats.notCheckedInCount} 人
现场补报名：${stats.walkInCount} 人
到场率：${percent(attendanceRate)}

统计时间：${formatDate(statisticAt.toISOString())}`;
}

async function sendTextMessage(webhook: string, content: string): Promise<NotifyResult> {
  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msgtype: "text",
        text: {
          content,
        },
      }),
    });

    const responseBody = (await response.json().catch(() => null)) as
      | { errcode?: number; errmsg?: string }
      | null;

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${response.status}`,
      };
    }

    if (responseBody?.errcode && responseBody.errcode !== 0) {
      return {
        ok: false,
        error: responseBody.errmsg ?? `企业微信返回错误码 ${responseBody.errcode}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "企业微信通知发送失败",
    };
  }
}

export async function notifyWecomRegistration(
  meeting: OutreachMeeting,
  registration: Registration,
  stats?: WecomMeetingStats,
) {
  if (!canSendWecomNotify(meeting)) {
    return { ok: false, skipped: true as const, error: "未配置企业微信通知" };
  }

  return sendTextMessage(
    meeting.wecomWebhook ?? "",
    registrationTemplate(meeting, registration, stats),
  );
}

export async function notifyWecomWalkInCheckin(
  meeting: OutreachMeeting,
  registration: Registration,
  stats?: WecomMeetingStats,
) {
  if (!canSendWecomNotify(meeting)) {
    return { ok: false, skipped: true as const, error: "未配置企业微信通知" };
  }

  return sendTextMessage(
    meeting.wecomWebhook ?? "",
    walkInTemplate(meeting, registration, stats),
  );
}

export async function notifyWecomCheckinSummary(
  meeting: OutreachMeeting,
  stats: WecomMeetingStats,
  statisticAt = new Date(),
) {
  if (!canSendWecomNotify(meeting)) {
    return { ok: false, skipped: true as const, error: "未配置企业微信通知" };
  }

  return sendTextMessage(
    meeting.wecomWebhook ?? "",
    checkinSummaryTemplate(meeting, stats, statisticAt),
  );
}
