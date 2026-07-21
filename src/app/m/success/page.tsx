import { CheckCircle2 } from "lucide-react";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { findRegistrationById, maskPhone } from "@/lib/registrations-store";
import { verifyPublicSuccessToken } from "@/lib/auth-session";
import { dateFormatter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MobileSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
  }>;
}) {
  const params = await searchParams;
  const result = await verifyPublicSuccessToken(params.token);
  const registration = result
    ? await findRegistrationById(result.registrationId)
    : null;
  const validResult = Boolean(
    result &&
      registration &&
      registration.meetingId === result.meetingId &&
      registration.status === "registered" &&
      (result.type === "registration" || registration.checkinStatus === "checked_in") &&
      (result.type !== "walk_in_checkin" || registration.source === "walk_in"),
  );
  const meeting = validResult && result
    ? await findOutreachMeeting(result.meetingId)
    : null;
  const isRegistration = validResult && result?.type === "registration";
  const isCheckin = validResult && result?.type === "checkin";
  const isWalkInCheckin = validResult && result?.type === "walk_in_checkin";
  const title = !validResult
    ? "确认链接无效"
    : isRegistration
      ? "报名成功"
      : isWalkInCheckin
        ? "报名并签到成功"
        : isCheckin
          ? "签到成功"
          : "操作成功";

  return (
    <MobileFormShell
      coverImageUrl={meeting?.coverImageUrl}
      description={validResult ? "请按现场工作人员指引继续参会。" : "请重新打开会议二维码页面。"}
      meetingLocation={meeting?.location}
      meetingTime={
        meeting ? dateFormatter.format(new Date(meeting.startTime)) : undefined
      }
      meetingTitle={meeting?.title}
      title={title}
    >
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 aria-hidden="true" className="h-8 w-8" />
        </div>
        {validResult && registration ? (
          <div className="mt-5 rounded-md bg-slate-50 p-4 text-left text-sm leading-6 text-slate-700">
            <p>参会人：{registration.name}</p>
            <p>手机号：{maskPhone(registration.phone)}</p>
            {isRegistration ? (
              <p className="mt-2 text-muted">
                请按会议时间到场，现场扫码签到。
              </p>
            ) : (
              <p className="mt-2 text-muted">
                欢迎参会，您已完成现场签到。
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted">
            该确认链接无效或已过期，请返回会议二维码页面重新操作。
          </p>
        )}
      </div>
    </MobileFormShell>
  );
}
