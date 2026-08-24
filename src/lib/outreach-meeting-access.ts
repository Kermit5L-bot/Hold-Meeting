import type { OutreachMeeting } from "@/lib/types";

export type OutreachAccessAction = "registration" | "checkin";

export interface OutreachAccessIssue {
  status: 404 | 409;
  title: string;
  message: string;
  code?: "registration_deadline_passed" | "registration_deadline_invalid";
  deadline?: string;
}

const registrationClosedMessage =
  "本场会议线上报名已结束。如需参会，请前往会场后扫描签到二维码，补充信息并完成签到。";

function appDateTimeMs(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return Number.NaN;
  }

  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)
    ? trimmed
    : `${trimmed.replace(" ", "T")}${trimmed.length === 16 ? ":00" : ""}+08:00`;

  return new Date(normalized).getTime();
}

export function getEffectiveRegistrationDeadline(meeting: OutreachMeeting) {
  return meeting.registrationDeadline?.trim() || meeting.startTime;
}

export function getRegistrationDeadlineDate(meeting: OutreachMeeting) {
  const deadlineMs = appDateTimeMs(getEffectiveRegistrationDeadline(meeting));
  return Number.isFinite(deadlineMs) ? new Date(deadlineMs) : null;
}

export function getOutreachAccessIssue(
  meeting: OutreachMeeting | null,
  action: OutreachAccessAction,
  now: Date | number = Date.now(),
): OutreachAccessIssue | null {
  const actionLabel = action === "registration" ? "报名" : "签到";

  if (!meeting) {
    return {
      status: 404,
      title: "会议不存在",
      message: `未找到对应外联会议，当前无法${actionLabel}。`,
    };
  }

  if (meeting.status !== "published") {
    return {
      status: 409,
      title: `${actionLabel}未开放`,
      message:
        meeting.status === "draft"
          ? `会议尚未发布，当前无法${actionLabel}。`
          : `会议已结束或归档，当前无法${actionLabel}。`,
    };
  }

  const enabled =
    action === "registration"
      ? meeting.registrationEnabled
      : meeting.checkinEnabled;

  if (!enabled) {
    return {
      status: 409,
      title: `${actionLabel}未开放`,
      message: `本场会议暂未开放${actionLabel}。`,
    };
  }

  if (action === "registration") {
    const deadline = getEffectiveRegistrationDeadline(meeting);
    const deadlineMs = appDateTimeMs(deadline);
    const nowMs = typeof now === "number" ? now : now.getTime();

    if (!Number.isFinite(deadlineMs)) {
      return {
        status: 409,
        title: "报名未开放",
        message: "本场会议的报名截止时间配置无效，请联系会议组织人员处理。",
        code: "registration_deadline_invalid",
      };
    }

    if (Number.isFinite(nowMs) && nowMs >= deadlineMs) {
      return {
        status: 409,
        title: "报名已截止",
        message: registrationClosedMessage,
        code: "registration_deadline_passed",
        deadline,
      };
    }
  }

  return null;
}
