import { NextResponse } from "next/server";
import { getOutreachAccessIssue } from "@/lib/outreach-meeting-access";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { isValidPhoneLength, phoneLengthMessage } from "@/lib/phone";
import { publicApiRateLimitResponse } from "@/lib/public-api-rate-limit";
import {
  findRegistrationByMeetingAndPhone,
  maskPhone,
} from "@/lib/registrations-store";

export async function POST(request: Request) {
  const rateLimited = publicApiRateLimitResponse(
    request,
    "checkin-lookup",
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

  const registration = await findRegistrationByMeetingAndPhone(meetingId, phone);

  if (!registration) {
    return NextResponse.json({ status: "not_found" });
  }

  if (registration.checkinStatus === "checked_in") {
    return NextResponse.json({
      status: "checked_in",
      registration: {
        name: registration.name,
        organizationName: registration.organizationName,
        phone: maskPhone(registration.phone),
        checkinAt: registration.checkinAt,
      },
    });
  }

  return NextResponse.json({
    status: "registered",
    registration: {
      name: registration.name,
      organizationName: registration.organizationName,
      phone: maskPhone(registration.phone),
    },
  });
}
