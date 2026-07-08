import type { ReactNode } from "react";
import { MobileCover } from "@/components/ui/mobile-cover";

export function MobileFormShell({
  title,
  description,
  coverImageUrl,
  meetingTitle,
  meetingTime,
  meetingLocation,
  children,
}: {
  title: string;
  description: string;
  coverImageUrl?: string;
  meetingTitle?: string;
  meetingTime?: string;
  meetingLocation?: string;
  children: ReactNode;
}) {
  const hasMeetingInfo = Boolean(meetingTitle || meetingTime || meetingLocation);

  return (
    <main className="min-h-dvh bg-canvas px-4 py-5">
      <section className="mx-auto max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <MobileCover
          alt={meetingTitle ? `${meetingTitle}会议头图` : "会议头图"}
          src={coverImageUrl}
        />
        {hasMeetingInfo ? (
          <div className="border-b border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold leading-7 text-ink">
              {meetingTitle}
            </h2>
            {meetingTime ? (
              <p className="mt-2 text-sm leading-6 text-muted">{meetingTime}</p>
            ) : null}
            {meetingLocation ? (
              <p className="mt-1 text-sm leading-6 text-muted">{meetingLocation}</p>
            ) : null}
          </div>
        ) : null}
        <div className="border-b border-slate-200 p-5">
          <p className="text-xs font-medium text-brand">会议扫码服务</p>
          <h1 className="mt-2 text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </main>
  );
}
