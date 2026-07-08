import { CheckinFlow } from "@/components/mobile/checkin-flow";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { dateFormatter } from "@/lib/utils";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);

  if (!meeting) {
    return (
      <MobileFormShell
        description="请确认签到链接是否完整，或联系现场工作人员重新获取二维码。"
        title="会议不存在"
      >
        <p className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-slate-700">
          未找到对应外联会议，当前无法签到。
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
      <CheckinFlow meetingId={meeting.id} />
    </MobileFormShell>
  );
}
