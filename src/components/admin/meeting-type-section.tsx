import type { ReactNode } from "react";

export function MeetingTypeSection({
  title,
  value,
  description,
  children,
}: {
  title: string;
  value: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-1 text-lg font-semibold text-ink">
          {value}
        </span>
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
