import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { dateFormatter, numberFormatter } from "@/lib/utils";
import type { MarketingCenterMeeting } from "@/lib/types";

export function MarketingMeetingList({
  meetings,
}: {
  meetings: MarketingCenterMeeting[];
}) {
  return (
    <DataTableShell
      title="营销中心会议台账"
      description="记录内部会议、专题会、培训会、复盘会和后续事项，第一阶段只展示结构。"
    >
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">会议主题</th>
            <th className="px-5 py-3">会议类型</th>
            <th className="px-5 py-3">时间</th>
            <th className="px-5 py-3">地点类型</th>
            <th className="px-5 py-3">参会范围</th>
            <th className="px-5 py-3">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meetings.map((meeting) => (
            <tr key={meeting.id}>
              <td className="px-5 py-4 font-medium text-ink">{meeting.title}</td>
              <td className="px-5 py-4 text-slate-600">
                {meeting.internalMeetingType}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {dateFormatter.format(new Date(meeting.startTime))}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {meeting.locationType === "online" ? "线上" : "线下"}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {numberFormatter.format(meeting.attendees.length)} 个团队
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={meeting.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}
