"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut } from "lucide-react";
import { requestJson } from "@/lib/client-json-request";
import { cn } from "@/lib/utils";

export function LogoutButton({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logout() {
    setSubmitting(true);
    setFailed(false);
    const result = await requestJson<{ ok?: boolean }>("/api/auth/logout", {
      method: "POST",
    }, "退出失败，请重试。");

    if (!result.ok) {
      setFailed(true);
      setSubmitting(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors duration-150",
        compact && "w-10 justify-center px-0",
        dark
          ? "border-cyan-300/20 bg-white/[0.06] text-cyan-50 hover:bg-cyan-300/10"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        failed && "border-red-300 text-red-700",
      )}
      aria-label={failed ? "退出失败，请重试" : "退出登录"}
      disabled={submitting}
      onClick={logout}
      title={failed ? "退出失败，请重试" : undefined}
      type="button"
    >
      {submitting ? (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut aria-hidden="true" className="h-4 w-4" />
      )}
      <span className={cn(compact && "sr-only")}>
        {submitting ? "退出中..." : failed ? "退出失败，请重试" : "退出"}
      </span>
    </button>
  );
}
