import { NextResponse } from "next/server";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { getOutreachAccessIssue } from "@/lib/outreach-meeting-access";
import { publicApiRateLimitResponse } from "@/lib/public-api-rate-limit";
import { parseRegistrationFormValues } from "@/lib/registration-request";
import { createWalkInRegistrationAndCheckin } from "@/lib/registrations-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { wakeWecomNotificationJob } from "@/lib/wecom-notification-job";
import { createPublicSuccessToken } from "@/lib/auth-session";

export async function POST(request: Request) {
  const rateLimited = publicApiRateLimitResponse(
    request,
    "registration-write",
    600,
    10 * 60 * 1000,
  );
  if (rateLimited) return rateLimited;

  const organizationTypeOptions = await readActiveSettingsOptions("organizationType");
  const parsed = parseRegistrationFormValues(
    await request.json().catch(() => null),
    new Set(organizationTypeOptions.map((option) => option.value)),
  );

  if (!parsed.values) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const values = parsed.values;
  const meeting = await findOutreachMeeting(values.meetingId);
  const accessIssue = getOutreachAccessIssue(meeting, "checkin");

  if (accessIssue) {
    return NextResponse.json(
      { message: accessIssue.message },
      { status: accessIssue.status },
    );
  }

  const result = await createWalkInRegistrationAndCheckin(values);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: "您已提交过报名信息，请返回后直接签到。",
      },
      { status: 409 },
    );
  }

  void wakeWecomNotificationJob().catch((error) => {
    console.error("唤醒企业微信现场补报名通知任务失败", error);
  });

  const successToken = await createPublicSuccessToken({
    registrationId: result.registration.id,
    meetingId: result.registration.meetingId,
    type: "walk_in_checkin",
  });

  return NextResponse.json({
    name: result.registration.name,
    phone: result.registration.phone,
    checkinAt: result.registration.checkinAt,
    successToken,
  });
}
