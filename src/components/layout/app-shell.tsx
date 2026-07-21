"use client";

import { Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { cn } from "@/lib/utils";
import type { PublicAdminUser } from "@/lib/admin-users";

export function AppShell({ children, currentUser, accountOptions }: { children: ReactNode; currentUser: PublicAdminUser; accountOptions: PublicAdminUser[] }) {
  const pathname = usePathname();
  const isDashboardHome = pathname === "/admin" || pathname === "/admin/dashboard";

  return (
    <div
      className={cn(
        "min-h-dvh text-ink",
        isDashboardHome ? "bg-[#040814]" : "bg-canvas",
      )}
    >
      <a
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-white px-4 py-2 text-sm font-medium text-brand shadow-lg transition-transform duration-150 focus-visible:translate-y-0"
        href="#main-content"
      >
        跳到主要内容
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden w-64 border-r lg:block",
          isDashboardHome
            ? "border-cyan-300/15 bg-slate-950 text-slate-100"
            : "border-slate-200 bg-white",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b px-5",
            isDashboardHome ? "border-cyan-300/15" : "border-slate-200",
          )}
        >
          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                isDashboardHome ? "text-white" : "text-ink",
              )}
            >
              万维盈创会议系统
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs",
                isDashboardHome ? "text-cyan-100/70" : "text-muted",
              )}
            >
              会议信息收集与统计
            </p>
          </div>
        </div>
        <div className="py-4">
          <Suspense fallback={null}>
            <SidebarNav currentUser={currentUser} dark={isDashboardHome} />
          </Suspense>
        </div>
      </aside>
      <div className="lg:pl-64">
        <TopBar accountOptions={accountOptions} currentUser={currentUser} dark={isDashboardHome} />
        <div
          className={cn(
            "border-b lg:hidden",
            isDashboardHome
              ? "border-cyan-300/15 bg-slate-950 text-slate-100"
              : "border-slate-200 bg-white",
          )}
        >
          <Suspense fallback={null}>
            <SidebarNav currentUser={currentUser} dark={isDashboardHome} mobile />
          </Suspense>
        </div>
        <main className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
