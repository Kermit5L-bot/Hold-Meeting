import { RegistrationForm } from "@/components/mobile/registration-form";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import {
  getOutreachAccessIssue,
  getRegistrationDeadlineDate,
} from "@/lib/outreach-meeting-access";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { dateFormatter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);
  const organizationTypeOptions = await readActiveSettingsOptions("organizationType");
  const accessIssue = getOutreachAccessIssue(meeting, "registration");
  const registrationDeadline =
    meeting && accessIssue?.code === "registration_deadline_passed"
      ? getRegistrationDeadlineDate(meeting)
      : null;

  if (!meeting || accessIssue) {
    const issue = accessIssue ?? {
      title: "会议不存在",
      message: "未找到对应外联会议，当前无法报名。",
    };
    return (
      <MobileFormShell
        coverImageUrl={meeting?.coverImageUrl}
        description={issue.message}
        meetingLocation={meeting?.location}
        meetingTime={
          meeting
            ? dateFormatter.format(new Date(meeting.startTime))
            : undefined
        }
        meetingTitle={meeting?.title}
        title={issue.title}
      >
        {registrationDeadline ? (
          <p className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-slate-700">
            报名截止时间：{dateFormatter.format(registrationDeadline)}
          </p>
        ) : (
          <p className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-slate-700">
            请联系会议组织人员确认开放时间或重新获取二维码。
          </p>
        )}
      </MobileFormShell>
    );
  }

  return (
    <MobileFormShell
      coverImageUrl={meeting.coverImageUrl}
      description="请填写参会信息。信息仅用于本次会议报名、现场签到和接待统计。"
      meetingLocation={meeting.location}
      meetingTime={dateFormatter.format(new Date(meeting.startTime))}
      meetingTitle={meeting.title}
      title="会议报名"
    >
      <RegistrationForm
        meetingId={meeting.id}
        organizationTypeOptions={organizationTypeOptions}
      />
    </MobileFormShell>
  );
}
