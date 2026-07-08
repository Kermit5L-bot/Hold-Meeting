import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { currencyFormatter, dateFormatter } from "@/lib/utils";
import type { ExternalForumMeeting } from "@/lib/types";

export function ExternalForumList({
  meetings,
}: {
  meetings: ExternalForumMeeting[];
}) {
  return (
    <DataTableShell
      title="外部会议&论坛台账"
      description="记录我司参会、赞助、演讲、费用和会议产出，第一阶段只展示结构。"
    >
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">会议主题</th>
            <th className="px-5 py-3">主办单位</th>
            <th className="px-5 py-3">会议时间</th>
            <th className="px-5 py-3">参会人</th>
            <th className="px-5 py-3">演讲</th>
            <th className="px-5 py-3">费用</th>
            <th className="px-5 py-3">状态</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meetings.map((meeting) => (
            <tr key={meeting.id}>
              <td className="px-5 py-4 font-medium text-ink">{meeting.title}</td>
              <td className="px-5 py-4 text-slate-600">{meeting.organizer}</td>
              <td className="px-5 py-4 text-slate-600">
                {dateFormatter.format(new Date(meeting.startTime))}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {meeting.attendees.join("、")}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {meeting.hasSpeech ? meeting.speaker : "否"}
              </td>
              <td className="px-5 py-4 text-slate-600">
                {currencyFormatter.format(meeting.cost)}
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
