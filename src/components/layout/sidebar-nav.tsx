"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarCheck,
  Settings,
  UsersRound,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  },
  {
    href: "/admin/external-forums",
    label: "外部会议&论坛",
    icon: Waypoints,
  },
  {
    href: "/admin/marketing-meetings",
    label: "营销中心会议",
    icon: UsersRound,
  },
  {
    href: "/admin/settings",
    label: "基础配置",
    icon: Settings,
  },
];

export function SidebarNav({
  dark = false,
  mobile = false,
}: {
  dark?: boolean;
  mobile?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="后台主导航"
      className={cn(
        mobile
          ? "flex gap-2 overflow-x-auto px-3 py-2"
          : "grid gap-1 px-3",
      )}
    >
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin" || pathname === "/admin/dashboard"
            : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            className={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150",
              mobile && "shrink-0",
              dark
                ? "text-slate-300 hover:bg-cyan-300/10 hover:text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-ink",
              isActive &&
                (dark
                  ? "border border-cyan-300/30 bg-cyan-300/15 text-white shadow-[0_0_18px_rgba(34,211,238,0.14)] hover:bg-cyan-300/15 hover:text-white"
                  : "bg-brand text-white hover:bg-brand hover:text-white"),
            )}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
