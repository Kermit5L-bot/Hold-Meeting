import { NextResponse } from "next/server";
import { getOutreachAccessIssue } from "@/lib/outreach-meeting-access";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { isValidPhoneLength, phoneLengthMessage } from "@/lib/phone";
import { publicApiRateLimitResponse } from "@/lib/public-api-rate-limit";
import { confirmCheckin, maskPhone } from "@/lib/registrations-store";
import { createPublicSuccessToken } from "@/lib/auth-session";

export async function POST(request: Request) {
  const rateLimited = publicApiRateLimitResponse(
    request,
    "checkin-confirm",
    1200,
    10 * 60 * 1000,
  );
  if (rateLimited) return rateLimited;

  const input = await request.json().catch(() => null);
  const body =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  const meetingId =
    typeof body.meetingId === "string" ? body.meetingId.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone : "";

  if (!meetingId || meetingId.length > 120) {
    return NextResponse.json(
      { message: "缺少会议信息，请重新打开签到链接。" },
      { status: 400 },
    );
  }

  if (phone.length > 30 || !isValidPhoneLength(phone)) {
    return NextResponse.json({ message: phoneLengthMessage() }, { status: 400 });
  }

  const meeting = await findOutreachMeeting(meetingId);
  const accessIssue = getOutreachAccessIssue(meeting, "checkin");

  if (accessIssue) {
    return NextResponse.json(
      { message: accessIssue.message },
      { status: accessIssue.status },
    );
  }

  const result = await confirmCheckin(meetingId, phone, "wechat_scan");

  if (!result.ok && result.reason === "not_found") {
    return NextResponse.json(
      { message: "未查询到报名信息，请先补充报名。" },
      { status: 404 },
    );
  }

  if (!result.ok && result.reason === "already_checked_in") {
    return NextResponse.json(
      {
        message: "您已完成签到，无需重复签到",
        registration: {
          name: result.registration.name,
          phone: maskPhone(result.registration.phone),
          checkinAt: result.registration.checkinAt,
        },
      },
      { status: 409 },
    );
  }

  const successToken = await createPublicSuccessToken({
    registrationId: result.registration.id,
    meetingId: result.registration.meetingId,
    type: "checkin",
  });

  return NextResponse.json({
    registration: {
      name: result.registration.name,
      phone: maskPhone(result.registration.phone),
      checkinAt: result.registration.checkinAt,
    },
    successToken,
  });
}
