"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  Settings,
  ShieldCheck,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  categoryLabels,
  settingsCategories,
} from "@/lib/settings-constants";
import type { SettingsCategory } from "@/lib/types";
import type { PublicAdminUser } from "@/lib/admin-users";

const navItems = [
  {
    href: "/admin",
    label: "数据看板",
    icon: BarChart3,
  },
  {
    href: "/admin/outreach-meetings",
    label: "外联会议",
    icon: CalendarCheck,
    module: "outreach_meetings" as const,
  },
  {
    href: "/admin/external-forums",
    label: "外部会议&论坛",
    icon: Waypoints,
    module: "external_forums" as const,
  },
  {
    href: "/admin/marketing-meetings",
    label: "营销中心会议",
    icon: UsersRound,
    module: "marketing_meetings" as const,
  },
  {
    href: "/admin/settings",
    label: "基础配置",
    icon: Settings,
    superOnly: true,
  },
  {
    href: "/admin/permissions",
    label: "权限管理",
    icon: ShieldCheck,
    superOnly: true,
  },
];

export function SidebarNav({
  dark = false,
  mobile = false,
  currentUser,
}: {
  dark?: boolean;
  mobile?: boolean;
  currentUser: PublicAdminUser;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category") as SettingsCategory | null;
  const activeSettingsCategory =
    requestedCategory && settingsCategories.includes(requestedCategory)
      ? requestedCategory
      : settingsCategories[0];

  return (
    <nav
      aria-label="后台主导航"
      className={cn(
        mobile
          ? "flex gap-2 overflow-x-auto px-3 py-2"
          : "grid gap-1 px-3",
      )}
    >
      {navItems.filter((item) => {
        if (item.superOnly) return currentUser.role === "super_admin";
        return !item.module || currentUser.role === "super_admin" || currentUser.permissions.includes(item.module);
      }).map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <div className={cn(mobile && "shrink-0")} key={item.href}>
            <Link
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
                dark
                  ? "text-slate-300 hover:bg-cyan-300/10 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-ink",
                isActive &&
                  (dark
                    ? "border border-cyan-300/30 bg-cyan-300/15 text-white shadow-[0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-300/15 hover:text-white"
                    : "bg-brand text-white hover:bg-brand hover:text-white"),
              )}
              href={
                item.href === "/admin/settings"
                  ? `/admin/settings?category=${settingsCategories[0]}${searchParams.get("accountId") ? `&accountId=${encodeURIComponent(searchParams.get("accountId") ?? "")}` : ""}`
                  : `${item.href}${searchParams.get("accountId") ? `?accountId=${encodeURIComponent(searchParams.get("accountId") ?? "")}` : ""}`
              }
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>

            {item.href === "/admin/settings" && isActive && !mobile ? (
              <div className="ml-5 mt-1 grid gap-0.5 border-l border-slate-200 pl-3">
                {settingsCategories.map((category) => (
                  <Link
                    aria-current={
                      activeSettingsCategory === category ? "page" : undefined
                    }
                    className={cn(
                      "flex min-h-9 items-center rounded-md px-3 py-2 text-sm transition-colors duration-150",
                      activeSettingsCategory === category
                        ? "bg-blue-50 font-medium text-brand"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                    )}
                    href={`/admin/settings?category=${category}${searchParams.get("accountId") ? `&accountId=${encodeURIComponent(searchParams.get("accountId") ?? "")}` : ""}`}
                    key={category}
                  >
                    {categoryLabels[category]}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
