import { CheckCircle2 } from "lucide-react";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { dateFormatter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MobileSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    name?: string;
    phone?: string;
    meetingId?: string;
  }>;
}) {
  const params = await searchParams;
  const meeting = params.meetingId
    ? await findOutreachMeeting(params.meetingId)
    : null;
  const isRegistration = params.type === "registration";
  const isCheckin = params.type === "checkin";
  const isWalkInCheckin = params.type === "walk_in_checkin";
  const title = isRegistration
    ? "报名成功"
    : isWalkInCheckin
      ? "报名并签到成功"
      : isCheckin
        ? "签到成功"
        : "操作成功";

  return (
    <MobileFormShell
      coverImageUrl={meeting?.coverImageUrl}
      description="请按现场工作人员指引继续参会。"
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
        {isRegistration || isCheckin || isWalkInCheckin ? (
          <div className="mt-5 rounded-md bg-slate-50 p-4 text-left text-sm leading-6 text-slate-700">
            <p>参会人：{params.name ?? "-"}</p>
            <p>手机号：{params.phone ?? "-"}</p>
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
            操作已完成，请按现场工作人员指引继续参会。
          </p>
        )}
      </div>
    </MobileFormShell>
  );
}
