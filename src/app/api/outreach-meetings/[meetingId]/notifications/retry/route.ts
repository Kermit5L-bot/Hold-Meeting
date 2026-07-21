import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { retryFailedWecomNotificationJobs } from "@/lib/registrations-store";
import { wakeWecomNotificationJob } from "@/lib/wecom-notification-job";
import { authorizeAdminRequest, recordInScope, resolveVerifiedRequestScope } from "@/lib/admin-access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);
  const auth = await authorizeAdminRequest("outreach_meetings"); if ("response" in auth) return auth.response;
  const scope = await resolveVerifiedRequestScope(auth.user, request);

  if (!meeting || !scope || !recordInScope(meeting.ownerUserId, scope)) {
    return NextResponse.json({ message: "未找到会议。" }, { status: 404 });
  }

  const retriedCount = await retryFailedWecomNotificationJobs(meetingId);

  if (retriedCount > 0) {
    void wakeWecomNotificationJob().catch((error) => {
      console.error("唤醒企业微信通知重试任务失败", error);
    });
  }

  return NextResponse.json({ retriedCount });
}
