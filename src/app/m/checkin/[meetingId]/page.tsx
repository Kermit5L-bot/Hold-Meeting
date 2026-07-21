import { CheckinFlow } from "@/components/mobile/checkin-flow";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import { getOutreachAccessIssue } from "@/lib/outreach-meeting-access";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { dateFormatter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);
  const organizationTypeOptions = await readActiveSettingsOptions("organizationType");
  const accessIssue = getOutreachAccessIssue(meeting, "checkin");

  if (!meeting || accessIssue) {
    const issue = accessIssue ?? {
      title: "会议不存在",
      message: "未找到对应外联会议，当前无法签到。",
    };
    return (
      <MobileFormShell
        description={issue.message}
        title={issue.title}
      >
        <p className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-slate-700">
          请联系现场工作人员确认开放时间或重新获取二维码。
        </p>
      </MobileFormShell>
    );
  }

  return (
    <MobileFormShell
      coverImageUrl={meeting.coverImageUrl}
      description="请输入报名手机号。已报名人员确认后完成签到，未报名人员可现场补报名并自动签到。"
      meetingLocation={meeting.location}
      meetingTime={dateFormatter.format(new Date(meeting.startTime))}
      meetingTitle={meeting.title}
      title="现场签到"
    >
      <CheckinFlow
        meetingId={meeting.id}
        organizationTypeOptions={organizationTypeOptions}
      />
    </MobileFormShell>
  );
}
