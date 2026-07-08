"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  dark = false,
  compact = false,
}: {
  dark?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
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
      )}
      aria-label="退出登录"
      onClick={logout}
      type="button"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      <span className={cn(compact && "sr-only")}>退出</span>
    </button>
  );
}
