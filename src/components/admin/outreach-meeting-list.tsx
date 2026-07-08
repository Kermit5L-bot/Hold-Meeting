import { QrCode } from "lucide-react";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { dateFormatter, numberFormatter } from "@/lib/utils";
import type { OutreachMeeting } from "@/lib/types";

export function OutreachMeetingList({
  meetings,
}: {
  meetings: OutreachMeeting[];
}) {
  return (
    <DataTableShell
      title="外联会议列表"
      description="后续将在这里接入会议创建、报名二维码、签到二维码和报名签到数据。"
    >
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">会议主题</th>
            <th className="px-5 py-3">时间</th>
            <th className="px-5 py-3">区域</th>
            <th className="px-5 py-3">负责人</th>
            <th className="px-5 py-3">报名/签到</th>
            <th className="px-5 py-3">状态</th>
            <th className="px-5 py-3">操作入口</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {meetings.map((meeting) => (
            <tr key={meeting.id}>
              <td className="px-5 py-4 font-medium text-ink">{meeting.title}</td>
              <td className="px-5 py-4 text-slate-600">
                {dateFormatter.format(new Date(meeting.startTime))}
              </td>
              <td className="px-5 py-4 text-slate-600">{meeting.region}</td>
              <td className="px-5 py-4 text-slate-600">{meeting.owner}</td>
              <td className="px-5 py-4 text-slate-600">
                {numberFormatter.format(meeting.registrationCount)} /{" "}
                {numberFormatter.format(meeting.checkinCount)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge status={meeting.status} />
              </td>
              <td className="px-5 py-4">
                <button
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                  type="button"
                >
                  <QrCode aria-hidden="true" className="h-4 w-4" />
                  二维码入口
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTableShell>
  );
}
