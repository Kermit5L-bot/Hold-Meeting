import type { DashboardMetric } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClasses: Record<DashboardMetric["tone"], string> = {
  brand: "border-brand/20 bg-brand/5 text-brand",
  success: "border-success/20 bg-success/5 text-success",
  warning: "border-warning/20 bg-warning/5 text-warning",
  neutral: "border-slate-200 bg-white text-ink",
};

export function MetricCard({ metric }: { metric: DashboardMetric }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div
        className={cn(
          "mb-4 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
          toneClasses[metric.tone],
        )}
      >
        {metric.label}
      </div>
      <p className="text-3xl font-semibold tracking-normal text-ink">
        {metric.value}
      </p>
      <p className="mt-2 text-sm text-muted">{metric.hint}</p>
    </section>
  );
}
