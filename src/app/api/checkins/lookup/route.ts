import { NextResponse } from "next/server";
import { isValidPhoneLength, phoneLengthMessage } from "@/lib/phone";
import {
  findRegistrationByMeetingAndPhone,
  maskPhone,
} from "@/lib/registrations-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get("meetingId") ?? "";
  const phone = searchParams.get("phone") ?? "";

  if (!meetingId) {
    return NextResponse.json(
      { message: "缺少会议信息，请重新打开签到链接。" },
      { status: 400 },
    );
  }

  if (!isValidPhoneLength(phone)) {
    return NextResponse.json({ message: phoneLengthMessage() }, { status: 400 });
  }

  const registration = await findRegistrationByMeetingAndPhone(meetingId, phone);

  if (!registration) {
    return NextResponse.json({ status: "not_found" });
  }

  if (registration.checkinStatus === "checked_in") {
    return NextResponse.json({
      status: "checked_in",
      registration: {
        id: registration.id,
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
      id: registration.id,
      name: registration.name,
      organizationName: registration.organizationName,
      phone: maskPhone(registration.phone),
    },
  });
}
