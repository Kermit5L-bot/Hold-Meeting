import { NextResponse } from "next/server";
import { isValidPhoneLength, phoneLengthMessage } from "@/lib/phone";
import { confirmCheckin, maskPhone } from "@/lib/registrations-store";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    meetingId?: string;
    phone?: string;
  };

  if (!body.meetingId) {
    return NextResponse.json(
      { message: "缺少会议信息，请重新打开签到链接。" },
      { status: 400 },
    );
  }

  if (!isValidPhoneLength(body.phone ?? "")) {
    return NextResponse.json({ message: phoneLengthMessage() }, { status: 400 });
  }

  const result = await confirmCheckin(body.meetingId, body.phone ?? "", "wechat_scan");

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

  return NextResponse.json({
    registration: {
      name: result.registration.name,
      phone: maskPhone(result.registration.phone),
      checkinAt: result.registration.checkinAt,
    },
  });
}
