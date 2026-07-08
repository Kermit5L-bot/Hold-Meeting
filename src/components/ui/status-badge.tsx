import type { MeetingStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusLabels: Record<MeetingStatus, string> = {
  draft: "草稿",
  published: "已发布",
  ended: "已结束",
  archived: "已归档",
};

const statusClasses: Record<MeetingStatus, string> = {
  draft: "border-warning/20 bg-warning/10 text-warning",
  published: "border-brand/20 bg-brand/10 text-brand",
  ended: "border-success/20 bg-success/10 text-success",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

export function StatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium",
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
