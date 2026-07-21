import type { OutreachMeeting } from "@/lib/types";

export type OutreachAccessAction = "registration" | "checkin";

export interface OutreachAccessIssue {
  status: 404 | 409;
  title: string;
  message: string;
}

export function getOutreachAccessIssue(
  meeting: OutreachMeeting | null,
  action: OutreachAccessAction,
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

  return null;
}
