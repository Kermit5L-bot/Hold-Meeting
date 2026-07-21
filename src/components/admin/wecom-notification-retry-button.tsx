"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { requestJson } from "@/lib/client-json-request";

export function WecomNotificationRetryButton({
  meetingId,
  accountId,
}: {
  meetingId: string;
  accountId: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function retry() {
    setSubmitting(true);
    setMessage("");
    setFailed(false);

    const result = await requestJson<{ retriedCount: number }>(
      `/api/outreach-meetings/${encodeURIComponent(meetingId)}/notifications/retry?accountId=${encodeURIComponent(accountId)}`,
      { method: "POST" },
      "重新发送失败，请稍后重试。",
    );

    if (!result.ok) {
      setFailed(true);
      setMessage(result.message);
      setSubmitting(false);
      return;
    }

    const count = result.data?.retriedCount ?? 0;
    setMessage(count > 0 ? `已重新提交 ${count} 条通知。` : "没有需要重试的通知。");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
        disabled={submitting}
        onClick={retry}
        type="button"
      >
        {submitting ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        )}
        {submitting ? "提交中..." : "重新发送失败通知"}
      </button>
      {message ? (
        <p
          aria-live="polite"
          className={failed ? "text-sm text-red-700" : "text-sm text-slate-600"}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
