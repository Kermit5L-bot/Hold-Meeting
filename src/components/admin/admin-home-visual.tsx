"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  CalendarCheck,
  ClipboardList,
  Handshake,
  MapPinned,
  Maximize2,
  Mic2,
  Monitor,
  Percent,
  UserPlus,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import {
  buildDashboardStats,
  defaultDashboardFilters,
  getDashboardYears,
  type RankItem,
} from "@/lib/dashboard-stats";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
  AdminModule,
} from "@/lib/types";
import {
  currencyFormatter,
  numberFormatter,
  percentFormatter,
} from "@/lib/utils";

function GlassPanel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-slate-950/50 p-5 shadow-[0_0_36px_rgba(14,165,233,0.12)] backdrop-blur">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-cyan-300/10 pb-4">
        <h2 className="text-xl font-semibold tracking-normal text-white">{title}</h2>
        <div className="flex h-10 w-10 items-center justify-center rounded border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
          {icon}
        </div>
      </div>
      {children}
    </section>
  );
}

function MetricTile({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      className="group relative overflow-hidden rounded-lg border border-cyan-300/15 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-150 hover:border-cyan-200/50 hover:bg-cyan-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
      href={href}
    >
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute bottom-3 right-3 h-14 w-14 text-white/10 transition-colors duration-150 group-hover:text-white/20"
        strokeWidth={1.2}
      />
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs leading-5 text-slate-300">{label}</p>
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 text-cyan-200 opacity-70 group-hover:opacity-100"
        />
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </Link>
  );
}

function EmptyState() {
  return (
    <p className="rounded border border-cyan-300/15 bg-white/[0.04] px-3 py-4 text-sm text-slate-400">
      当前年度暂无数据。
    </p>
  );
}

function NeonRank({
  title,
  items,
  formatter = numberFormatter.format,
}: {
  title: string;
  items: RankItem[];
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-lg border border-cyan-300/15 bg-white/[0.04] p-4">
      <h3 className="text-sm font-semibold text-cyan-50">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.slice(0, 6).map((item, index) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-slate-300">
                  {index + 1}. {item.label}
                </span>
                <span className="font-medium text-cyan-100">
                  {formatter(item.value)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.55)]"
                  style={{ width: `${Math.max((item.value / max) * 100, 5)}%` }}
                  title={`${item.label}: ${formatter(item.value)}`}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function DarkTrend({ title, items }: { title: string; items: RankItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasData = items.some((item) => item.value > 0);

  return (
    <div className="rounded-lg border border-cyan-300/15 bg-white/[0.04] p-4">
      <h3 className="text-sm font-semibold text-cyan-50">{title}</h3>
      {hasData ? (
        <div className="mt-4 flex h-44 items-end gap-2 border-b border-cyan-300/20 pt-6">
          {items.map((item) => {
            const height = Math.max((item.value / max) * 112, 4);

            return (
              <div className="flex flex-1 flex-col items-center gap-2" key={item.label}>
                <span className="text-[11px] font-medium text-cyan-100">
                  {numberFormatter.format(item.value)}
                </span>
                <div
                  className="w-full rounded-t bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.42)]"
                  style={{ height: `${height}px` }}
                  title={`${item.label}: ${item.value}`}
                />
                <span className="text-[10px] text-slate-400">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState />
        </div>
      )}
    </div>
  );
}

export function AdminHomeVisual({
  outreachMeetings,
  registrations,
  externalForums,
  marketingMeetings,
  optionLabels,
  accountId,
  visibleModules,
}: {
  outreachMeetings: OutreachMeeting[];
  registrations: Registration[];
  externalForums: ExternalForumRecord[];
  marketingMeetings: MarketingMeetingRecord[];
  optionLabels: {
    organizationType: Record<string, string>;
    meetingOutput: Record<string, string>;
    marketingMeetingType: Record<string, string>;
  };
  accountId: string;
  visibleModules: AdminModule[];
}) {
  const screenRef = useRef<HTMLDivElement>(null);
  const years = useMemo(
    () => getDashboardYears({ outreachMeetings, externalForums, marketingMeetings }),
    [externalForums, marketingMeetings, outreachMeetings],
  );
  const [year, setYear] = useState(defaultDashboardFilters.year);
  const scopedHref = (path: string) => `${path}?accountId=${encodeURIComponent(accountId)}`;

  const stats = useMemo(
    () =>
      buildDashboardStats({
        outreachMeetings,
        registrations,
        externalForums,
        marketingMeetings,
        filters: {
          ...defaultDashboardFilters,
          year,
        },
        optionLabels,
      }),
    [
      externalForums,
      marketingMeetings,
      optionLabels,
      outreachMeetings,
      registrations,
      year,
    ],
  );

  async function toggleFullscreen() {
    if (!screenRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await screenRef.current.requestFullscreen();
  }

  return (
    <div
      className="-mx-3 -my-4 min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#040814] text-slate-100 sm:-mx-6 sm:-my-6 lg:-mx-8"
      ref={screenRef}
    >
      <div className="relative min-h-[calc(100dvh-4rem)] px-4 py-5 sm:px-7 sm:py-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 16% 12%, rgba(34,211,238,0.20), transparent 30%), radial-gradient(circle at 84% 16%, rgba(59,130,246,0.22), transparent 32%), linear-gradient(135deg, #06111f 0%, #040814 44%, #071827 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative grid gap-6">
          <header className="flex flex-col gap-4 border-b border-cyan-300/20 pb-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-[0.18em] text-cyan-200">
                万维盈创会议数据驾驶舱
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-white">
                万维盈创会议信息可视化首页
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                聚焦外联会议、外部会议&论坛、营销中心会议三类核心数据。
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3 md:ml-6 md:justify-end">
              <label className="flex items-center gap-2 text-sm font-medium text-cyan-50">
                年度
                <select
                  className="h-10 rounded-md border border-cyan-300/25 bg-slate-950/80 px-3 text-sm text-cyan-50 outline-none transition-colors duration-150 hover:border-cyan-200 focus-visible:border-cyan-200"
                  name="homeYear"
                  onChange={(event) => setYear(event.target.value)}
                  value={year}
                >
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-3 text-sm font-medium text-cyan-50 transition-colors duration-150 hover:border-cyan-200 hover:bg-cyan-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                onClick={toggleFullscreen}
                type="button"
              >
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
                全屏展示
              </button>
            </div>
          </header>

          <div className="grid gap-6 2xl:grid-cols-[1.15fr_0.85fr]">
            {visibleModules.includes("outreach_meetings") ? (
            <GlassPanel
              icon={<CalendarCheck aria-hidden="true" className="h-5 w-5" />}
              title="外联会议数据区域"
            >
              <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
                <MetricTile href={scopedHref("/admin/outreach-meetings")} icon={CalendarCheck} label="外联会议数量" value={numberFormatter.format(stats.outreach.meetingCount)} />
                <MetricTile href={scopedHref("/admin/outreach-meetings")} icon={UsersRound} label="报名总人数" value={numberFormatter.format(stats.outreach.registrationCount)} />
                <MetricTile href={scopedHref("/admin/outreach-meetings")} icon={UserRoundCheck} label="签到总人数" value={numberFormatter.format(stats.outreach.checkinCount)} />
                <MetricTile href={scopedHref("/admin/outreach-meetings")} icon={Percent} label="到场率" value={percentFormatter.format(stats.outreach.attendanceRate)} />
                <MetricTile href={scopedHref("/admin/outreach-meetings")} icon={UserPlus} label="现场补报名" value={numberFormatter.format(stats.outreach.walkInCount)} />
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <NeonRank title="单位类型排名" items={stats.outreach.unitTypeRanking} />
                <NeonRank title="区域参与人数" items={stats.outreach.regionParticipation} />
                <NeonRank title="单场报名排行" items={stats.outreach.registrationRanking} />
                <NeonRank title="单场签到排行" items={stats.outreach.checkinRanking} />
              </div>
            </GlassPanel>
            ) : null}

            {visibleModules.some((item) => item === "external_forums" || item === "marketing_meetings") ? (
            <GlassPanel
              icon={<Activity aria-hidden="true" className="h-5 w-5" />}
              title="会议运行趋势"
            >
              <div className="grid gap-4">
                {visibleModules.includes("external_forums") ? <DarkTrend title="外部会议月度趋势" items={stats.external.monthlyTrend} /> : null}
                {visibleModules.includes("marketing_meetings") ? <DarkTrend title="营销中心月度趋势" items={stats.marketing.monthlyTrend} /> : null}
              </div>
            </GlassPanel>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {visibleModules.includes("external_forums") ? <GlassPanel
              icon={<Waypoints aria-hidden="true" className="h-5 w-5" />}
              title="外部会议&论坛数据区域"
            >
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile href={scopedHref("/admin/external-forums")} icon={Waypoints} label="参加会议场次" value={numberFormatter.format(stats.external.meetingCount)} />
                <MetricTile href={scopedHref("/admin/external-forums")} icon={WalletCards} label="费用总额" value={currencyFormatter.format(stats.external.costTotal)} />
                <MetricTile href={scopedHref("/admin/external-forums")} icon={Mic2} label="演讲场次" value={numberFormatter.format(stats.external.speechCount)} />
                <MetricTile href={scopedHref("/admin/external-forums")} icon={Handshake} label="赞助场次" value={numberFormatter.format(stats.external.sponsoredCount)} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <NeonRank title="部门参与次数排名" items={stats.external.businessUnitRanking} />
                <NeonRank formatter={currencyFormatter.format} title="会议费用排名" items={stats.external.costRanking} />
              </div>
            </GlassPanel> : null}

            {visibleModules.includes("marketing_meetings") ? <GlassPanel
              icon={<UsersRound aria-hidden="true" className="h-5 w-5" />}
              title="营销中心会议数据区域"
            >
              <div className="grid gap-4 md:grid-cols-4">
                <MetricTile href={scopedHref("/admin/marketing-meetings")} icon={ClipboardList} label="会议总次数" value={numberFormatter.format(stats.marketing.meetingCount)} />
                <MetricTile href={scopedHref("/admin/marketing-meetings")} icon={Monitor} label="线上会议次数" value={numberFormatter.format(stats.marketing.onlineCount)} />
                <MetricTile href={scopedHref("/admin/marketing-meetings")} icon={MapPinned} label="线下会议次数" value={numberFormatter.format(stats.marketing.offlineCount)} />
                <MetricTile href={scopedHref("/admin/marketing-meetings")} icon={UsersRound} label="参会人次数" value={numberFormatter.format(stats.marketing.attendeeCount)} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <NeonRank title="所属部门排名" items={stats.marketing.businessUnitRanking} />
                <NeonRank title="会议类型分布" items={stats.marketing.typeDistribution} />
              </div>
            </GlassPanel> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
