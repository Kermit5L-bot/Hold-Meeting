import { RegistrationForm } from "@/components/mobile/registration-form";
import { MobileFormShell } from "@/components/ui/mobile-form-shell";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import { dateFormatter } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ meetingId: string }>;
}) {
  const { meetingId } = await params;
  const meeting = await findOutreachMeeting(meetingId);

  if (!meeting) {
    return (
      <MobileFormShell
        description="请确认报名链接是否完整，或联系会议组织人员重新获取二维码。"
        title="会议不存在"
      >
        <p className="rounded-md border border-warning/20 bg-warning/10 p-4 text-sm leading-6 text-slate-700">
          未找到对应外联会议，当前无法提交报名。
        </p>
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
      <RegistrationForm meetingId={meeting.id} />
    </MobileFormShell>
  );
}
