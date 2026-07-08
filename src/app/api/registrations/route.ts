import { NextResponse } from "next/server";
import { isValidPhoneLength, phoneLengthMessage } from "@/lib/phone";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  createRegistration,
  findRegistrationById,
  updateRegistrationWecomNotifyStatus,
} from "@/lib/registrations-store";
import type { RegistrationFormValues } from "@/lib/types";
import { notifyWecomRegistration } from "@/lib/wecom-notifier";

function validateRegistration(values: RegistrationFormValues) {
  if (!values.meetingId.trim()) {
    return "缺少会议信息，请重新打开报名链接。";
  }

  if (!values.name.trim()) {
    return "请填写姓名。";
  }

  if (!values.organizationType) {
    return "请选择单位类型。";
  }

  if (values.organizationType === "other" && !values.otherOrganizationType.trim()) {
    return "请选择或填写其他单位类型。";
  }

  if (!values.organizationName.trim()) {
    return "请填写单位名称。";
  }

  if (!isValidPhoneLength(values.phone)) {
    return phoneLengthMessage();
  }

  if (!values.meal) {
    return "请选择是否用餐。";
  }

  return null;
}

async function sendWecomNotifyIfNeeded(registrationId: string) {
  const meeting = await findOutreachMeetingByRegistration(registrationId);
  if (!meeting?.registration) {
    return;
  }

  const result = await notifyWecomRegistration(meeting.meeting, meeting.registration);

  if ("skipped" in result && result.skipped) {
    return;
  }

  if (result.ok) {
    await updateRegistrationWecomNotifyStatus(registrationId, "success");
    return;
  }

  console.error("企业微信报名通知发送失败", {
    meetingId: meeting.meeting.id,
    registrationId,
    error: result.error,
  });
  await updateRegistrationWecomNotifyStatus(
    registrationId,
    "failed",
    result.error ?? "企业微信报名通知发送失败",
  );
}

async function findOutreachMeetingByRegistration(registrationId: string) {
  const registration = await findRegistrationById(registrationId);

  if (!registration) {
    return null;
  }

  const meeting = await findOutreachMeeting(registration.meetingId);

  if (!meeting) {
    return null;
  }

  return { meeting, registration };
}

export async function POST(request: Request) {
  const values = (await request.json()) as RegistrationFormValues;
  const validationMessage = validateRegistration(values);

  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const result = await createRegistration(values, "pre_meeting");

  if (!result.ok) {
    return NextResponse.json(
      {
        message: "您已提交过报名信息",
        registrationId: result.registration.id,
      },
      { status: 409 },
    );
  }

  void sendWecomNotifyIfNeeded(result.registration.id).catch((error) => {
    console.error("企业微信报名通知后台任务失败", error);
  });

  return NextResponse.json({
    registrationId: result.registration.id,
    name: result.registration.name,
    phone: result.registration.phone,
  });
}
