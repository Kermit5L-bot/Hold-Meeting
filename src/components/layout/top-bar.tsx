"use client";

import { useEffect, useState } from "react";
import { Bell, Search } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";

interface CurrentUser {
  displayName: string;
  role: string;
}

export function TopBar({ dark = false }: { dark?: boolean }) {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      const response = await fetch("/api/auth/me");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { user?: CurrentUser };

      if (!ignore) {
        setUser(data.user ?? null);
      }
    }

    void loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6",
        dark
          ? "border-cyan-300/15 bg-slate-950 text-slate-100"
          : "border-slate-200 bg-white text-ink",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 sm:hidden">
        <div>
          <p className={cn("text-sm font-semibold", dark ? "text-white" : "text-ink")}>
            万维盈创会议系统
          </p>
          <p className={cn("mt-0.5 text-xs", dark ? "text-cyan-100/70" : "text-muted")}>
            会议信息收集与统计
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label="查看通知"
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-150",
              dark
                ? "border-cyan-300/20 bg-white/[0.06] text-cyan-100 hover:bg-cyan-300/10"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            type="button"
          >
            <Bell aria-hidden="true" className="h-4 w-4" />
          </button>
          <LogoutButton dark={dark} compact />
        </div>
      </div>

      <form className="relative w-full sm:max-w-md">
        <label className="sr-only" htmlFor="global-search">
          搜索会议
        </label>
        <Search
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2",
            dark ? "text-cyan-100/60" : "text-slate-400",
          )}
        />
        <input
          autoComplete="off"
          className={cn(
            "h-10 w-full rounded-md border pl-9 pr-3 text-sm outline-none transition-colors duration-150",
            dark
              ? "border-cyan-300/20 bg-white/[0.06] text-slate-100 placeholder:text-slate-500 focus:border-cyan-200"
              : "border-slate-200 bg-canvas text-ink focus:border-brand",
          )}
          id="global-search"
          name="globalSearch"
          placeholder="搜索会议主题、负责人、区域"
          type="search"
        />
      </form>
      <div className="ml-4 hidden items-center gap-2 sm:flex">
        <div className="hidden text-right sm:block">
          <p className={cn("text-sm font-medium", dark ? "text-white" : "text-ink")}>
            {user?.displayName ?? "超级管理员"}
          </p>
          <p className={cn("text-xs", dark ? "text-cyan-100/70" : "text-muted")}>
            {user?.role ?? "super_admin"}
          </p>
        </div>
        <button
          aria-label="查看通知"
          className={cn(
            "inline-flex h-10 w-10 items-center justify-center rounded-md border transition-colors duration-150",
            dark
              ? "border-cyan-300/20 bg-white/[0.06] text-cyan-100 hover:bg-cyan-300/10"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}
          type="button"
        >
          <Bell aria-hidden="true" className="h-4 w-4" />
        </button>
        <LogoutButton dark={dark} />
      </div>
    </header>
  );
}
