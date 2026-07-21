"use client";

import { useMemo, useState } from "react";
import {
  buildDashboardStats,
  defaultDashboardFilters,
  getDashboardYears,
  type DashboardFilters,
  type RankItem,
  uniqueDashboardOptions,
} from "@/lib/dashboard-stats";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
} from "@/lib/types";
import {
  currencyFormatter,
  numberFormatter,
  percentFormatter,
} from "@/lib/utils";

const monthOptions = [
  { value: "all", label: "全部" },
  ...Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}月`,
  })),
];

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

function EmptyState({ message = "当前筛选条件下暂无数据。" }: { message?: string }) {
  return (
    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-muted">
      {message}
    </p>
  );
}

function BarList({
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length ? (
          items.slice(0, 8).map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-slate-700">{item.label}</span>
                <span className="font-medium text-ink">{formatter(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-brand"
                  style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function RankingList({
  title,
  items,
  formatter = numberFormatter.format,
}: {
  title: string;
  items: RankItem[];
  formatter?: (value: number) => string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <ol className="mt-4 grid gap-3">
        {items.length ? (
          items.slice(0, 8).map((item, index) => (
            <li className="flex items-center justify-between gap-4" key={item.label}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-100 text-xs font-semibold text-slate-600">
                  {index + 1}
                </span>
                <span className="truncate text-sm text-slate-700">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-ink">
                {formatter(item.value)}
              </span>
            </li>
          ))
        ) : (
          <li>
            <EmptyState />
          </li>
        )}
      </ol>
    </section>
  );
}

function TrendChart({ title, items }: { title: string; items: RankItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const hasData = items.some((item) => item.value > 0);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {hasData ? (
        <div className="mt-4 flex h-40 items-end gap-2 border-b border-slate-200">
          {items.map((item) => (
            <div className="flex flex-1 flex-col items-center gap-2" key={item.label}>
              <div
                aria-label={`${item.label} ${item.value}`}
                className="w-full rounded-t bg-success"
                style={{ height: `${Math.max((item.value / max) * 128, 4)}px` }}
                title={`${item.label}: ${item.value}`}
              />
              <span className="text-[11px] text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState message="当前年度暂无月度趋势数据。" />
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

export function DashboardView({
  outreachMeetings,
  registrations,
  externalForums,
  marketingMeetings,
}: {
  outreachMeetings: OutreachMeeting[];
  registrations: Registration[];
  externalForums: ExternalForumRecord[];
  marketingMeetings: MarketingMeetingRecord[];
}) {
  const [filters, setFilters] = useState<DashboardFilters>(
    defaultDashboardFilters,
  );

  const years = useMemo(
    () => getDashboardYears({ outreachMeetings, externalForums, marketingMeetings }),
    [externalForums, marketingMeetings, outreachMeetings],
  );

  const businessUnitOptions = useMemo(
    () =>
      uniqueDashboardOptions([
        ...outreachMeetings.map((meeting) => meeting.businessUnit),
        ...externalForums.map((meeting) => meeting.businessUnit),
        ...marketingMeetings.map((meeting) => meeting.businessUnit),
      ]),
    [externalForums, marketingMeetings, outreachMeetings],
  );

  const regionOptions = useMemo(
    () => uniqueDashboardOptions(outreachMeetings.map((meeting) => meeting.region)),
    [outreachMeetings],
  );

  const stats = useMemo(
    () =>
      buildDashboardStats({
        outreachMeetings,
        registrations,
        externalForums,
        marketingMeetings,
        filters,
      }),
    [externalForums, filters, marketingMeetings, outreachMeetings, registrations],
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">数据看板</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            三类会议业务看板
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            按年度、月份、所属部门和区域筛选当前列表数据，分别展示外联会议、外部会议&论坛、营销中心会议指标。
          </p>
        </div>
      </div>

      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-5"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="grid gap-1 text-sm font-medium text-ink">
          年度
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="year"
            onChange={(event) =>
              setFilters((current) => ({ ...current, year: event.target.value }))
            }
            value={filters.year}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          月份
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="month"
            onChange={(event) =>
              setFilters((current) => ({ ...current, month: event.target.value }))
            }
            value={filters.month}
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          所属部门
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="businessUnit"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                businessUnit: event.target.value,
              }))
            }
            value={filters.businessUnit}
          >
            <option value="all">全部</option>
            {businessUnitOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          区域
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="region"
            onChange={(event) =>
              setFilters((current) => ({ ...current, region: event.target.value }))
            }
            value={filters.region}
          >
            <option value="all">全部</option>
            {regionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            className="h-10 w-full rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={() => setFilters(defaultDashboardFilters)}
            type="button"
          >
            重置筛选
          </button>
        </div>
      </form>

      <Section
        description="统计外联会议的报名、签到、现场补报名、用餐和参与结构。"
        title="外联会议看板"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="外联会议数量" value={numberFormatter.format(stats.outreach.meetingCount)} />
          <MetricCard label="报名总人数" value={numberFormatter.format(stats.outreach.registrationCount)} />
          <MetricCard label="签到总人数" value={numberFormatter.format(stats.outreach.checkinCount)} />
          <MetricCard label="未签到人数" value={numberFormatter.format(stats.outreach.notCheckedInCount)} />
          <MetricCard label="现场补报名人数" value={numberFormatter.format(stats.outreach.walkInCount)} />
          <MetricCard
            hint="签到总人数 / 报名总人数"
            label="到场率"
            value={percentFormatter.format(stats.outreach.attendanceRate)}
          />
          <MetricCard label="用餐人数" value={numberFormatter.format(stats.outreach.mealCount)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <BarList title="单位类型排名" items={stats.outreach.unitTypeRanking} />
          <BarList title="区域参与人数" items={stats.outreach.regionParticipation} />
          <RankingList title="单场会议报名排行" items={stats.outreach.registrationRanking} />
          <RankingList title="单场会议签到排行" items={stats.outreach.checkinRanking} />
          <div className="xl:col-span-2">
            <TrendChart title="月度外联会议趋势" items={stats.outreach.monthlyTrend} />
          </div>
        </div>
      </Section>

      <Section
        description="统计我司参加、赞助、演讲的外部会议或行业论坛。"
        title="外部会议&论坛看板"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="参加会议场次" value={numberFormatter.format(stats.external.meetingCount)} />
          <MetricCard label="费用总额" value={currencyFormatter.format(stats.external.costTotal)} />
          <MetricCard label="演讲场次" value={numberFormatter.format(stats.external.speechCount)} />
          <MetricCard label="赞助场次" value={numberFormatter.format(stats.external.sponsoredCount)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <BarList title="所属部门参与次数排名" items={stats.external.businessUnitRanking} />
          <RankingList formatter={currencyFormatter.format} title="会议费用排名" items={stats.external.costRanking} />
          <BarList title="演讲人统计" items={stats.external.speakerStats} />
          <BarList title="主办单位统计" items={stats.external.organizerStats} />
          <BarList title="会议产出统计" items={stats.external.outputStats} />
          <TrendChart title="月度外部会议趋势" items={stats.external.monthlyTrend} />
        </div>
      </Section>

      <Section
        description="统计营销中心内部会议组织情况、线上线下结构和会议类型分布。"
        title="营销中心会议看板"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="会议总次数" value={numberFormatter.format(stats.marketing.meetingCount)} />
          <MetricCard label="线上会议次数" value={numberFormatter.format(stats.marketing.onlineCount)} />
          <MetricCard label="线下会议次数" value={numberFormatter.format(stats.marketing.offlineCount)} />
          <MetricCard label="参会人次数" value={numberFormatter.format(stats.marketing.attendeeCount)} />
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <BarList title="所属部门排名" items={stats.marketing.businessUnitRanking} />
          <BarList title="会议类型分布" items={stats.marketing.typeDistribution} />
          <div className="xl:col-span-2">
            <TrendChart title="月度会议趋势" items={stats.marketing.monthlyTrend} />
          </div>
        </div>
      </Section>
    </div>
  );
}
