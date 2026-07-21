import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Download, ExternalLink } from "lucide-react";
import { WecomNotificationRetryButton } from "@/components/admin/wecom-notification-retry-button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { findOutreachMeeting } from "@/lib/outreach-meetings-store";
import {
  checkinMethodLabels,
  checkinStatusLabels,
  mealPreferenceLabels,
  registrationSourceLabels,
  registrationStatusLabels,
} from "@/lib/registration-options";
import {
  listRegistrationsByMeeting,
  listWecomNotificationJobsByMeeting,
  type WecomNotificationJob,
} from "@/lib/registrations-store";
import { readSettingsLabelMap } from "@/lib/settings-options";
import type { OrganizationType, WecomNotifyStatus } from "@/lib/types";
import { dateFormatter, numberFormatter } from "@/lib/utils";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { hasAdminModule, recordInScope, resolveVerifiedAccountScope } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

function getOrganizationLabel(
  organizationType: OrganizationType,
  otherOrganizationType?: string,
  labels: Record<string, string> = {},
) {
  if (organizationType === "other") {
    return otherOrganizationType || "其他";
  }

  return labels[organizationType] ?? organizationType;
}

function WecomNotificationStatus({
  enabled,
  job,
  legacyStatus,
  legacyError,
}: {
  enabled: boolean;
  job?: WecomNotificationJob;
  legacyStatus?: WecomNotifyStatus;
  legacyError?: string;
}) {
  if (!enabled) {
    return <span className="text-slate-500">未启用</span>;
  }

  if (job?.status === "succeeded" || (!job && legacyStatus === "success")) {
    return <span className="text-green-700">已发送</span>;
  }

  if (job?.status === "pending") {
    return <span className="text-amber-700">等待发送</span>;
  }

  if (job?.status === "processing") {
    return <span className="text-blue-700">发送中</span>;
  }

  if (job?.status === "dead" || (!job && legacyStatus === "failed")) {
    return (
      <span className="text-red-700" title={job?.lastError ?? legacyError}>
        发送失败
      </span>
    );
  }

  if (job?.status === "skipped") {
    return <span className="text-slate-500">已跳过</span>;
  }

  return <span className="text-slate-500">未发送</span>;
}

async function createQrCode(url: string) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 220,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() ?? "";
}

function normalizeBaseUrl(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(
      trimmedValue.includes("://") ? trimmedValue : `https://${trimmedValue}`,
    );

    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function getPublicBaseUrl(requestHeaders: { get(name: string): string | null }) {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL,
  );

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const forwardedHost = getFirstHeaderValue(
    requestHeaders.get("x-forwarded-host"),
  );
  const host = forwardedHost || getFirstHeaderValue(requestHeaders.get("host"));
  const protocol =
    getFirstHeaderValue(requestHeaders.get("x-forwarded-proto")) ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host || "localhost:3000"}`;
}

export default async function OutreachMeetingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ meetingId: string }>;
  searchParams: Promise<{ accountId?: string }>;
}) {
  const { meetingId } = await params;
  const { accountId } = await searchParams;
  const user = await getCurrentAdminUser(); if (!user) redirect("/login");
  if (!hasAdminModule(user, "outreach_meetings")) redirect("/admin/forbidden");
  const scope = await resolveVerifiedAccountScope(user, accountId); if (!scope) redirect("/admin/forbidden");
  const meeting = await findOutreachMeeting(meetingId);

  if (!meeting || !recordInScope(meeting.ownerUserId, scope)) {
    return (
      <div className="grid gap-4">
        <PageHeader
          description="未找到对应外联会议。当前详情页只读取外联会议记录。"
          title="会议不存在"
        />
        <Link
          className="text-sm font-medium text-brand"
          href={`/admin/outreach-meetings?accountId=${encodeURIComponent(scope.requested)}`}
        >
          返回外联会议列表
        </Link>
      </div>
    );
  }

  const requestHeaders = await headers();
  const publicBaseUrl = getPublicBaseUrl(requestHeaders);
  const registrationUrl = `${publicBaseUrl}/m/register/${meeting.id}`;
  const checkinUrl = `${publicBaseUrl}/m/checkin/${meeting.id}`;
  const [
    registrationQrCode,
    checkinQrCode,
    registrations,
    notificationJobs,
    organizationTypeLabels,
  ] =
    await Promise.all([
      createQrCode(registrationUrl),
      createQrCode(checkinUrl),
      listRegistrationsByMeeting(meeting.id),
      listWecomNotificationJobsByMeeting(meeting.id),
      readSettingsLabelMap("organizationType"),
    ]);
  const notificationJobByRegistrationId = new Map(
    notificationJobs.map((job) => [job.registrationId, job]),
  );
  const failedNotificationCount = registrations.filter((registration) => {
    const job = notificationJobByRegistrationId.get(registration.id);
    return job?.status === "dead" || (!job && registration.wecomNotifyStatus === "failed");
  }).length;
  const checkedInCount = registrations.filter(
    (registration) => registration.checkinStatus === "checked_in",
  ).length;
  const walkInCount = registrations.filter(
    (registration) => registration.isWalkIn,
  ).length;
  const notCheckedInCount = registrations.length - checkedInCount;
  const scopeQuery = `?accountId=${encodeURIComponent(scope.requested)}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        actions={
          <>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
              href={`/admin/outreach-meetings/${meeting.id}/registrations/export${scopeQuery}`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              导出报名数据
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
              href={`/admin/outreach-meetings/${meeting.id}/checkins/export${scopeQuery}`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              导出签到数据
            </Link>
          </>
        }
        description="查看外联会议的报名二维码、签到二维码、报名人员和签到结果。"
        title={meeting.title}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">报名人数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {numberFormatter.format(registrations.length)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">已签到人数</p>
          <p className="mt-2 text-3xl font-semibold text-success">
            {numberFormatter.format(checkedInCount)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">未签到人数</p>
          <p className="mt-2 text-3xl font-semibold text-warning">
            {numberFormatter.format(notCheckedInCount)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">现场补报名</p>
          <p className="mt-2 text-3xl font-semibold text-brand">
            {numberFormatter.format(walkInCount)}
          </p>
        </article>
      </section>

      {meeting.enableWecomNotify && failedNotificationCount > 0 ? (
        <section className="flex flex-wrap items-center justify-between gap-4 border-y border-red-200 bg-red-50 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-red-900">
              有 {failedNotificationCount} 条企业微信通知发送失败
            </h2>
            <p className="mt-1 text-sm text-red-700">
              请先确认机器人 Webhook 可用，再重新提交失败通知。
            </p>
          </div>
          <WecomNotificationRetryButton accountId={scope.requested} meetingId={meeting.id} />
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">报名二维码</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            用户扫码后进入移动端报名页，提交后会写入当前会议的报名列表。
          </p>
          <div className="mt-4 flex justify-center rounded-lg border border-slate-200 bg-white p-4">
            <Image
              alt={`${meeting.title} 报名二维码`}
              height={220}
              src={registrationQrCode}
              width={220}
              unoptimized
            />
          </div>
          <p className="mt-4 break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {registrationUrl}
          </p>
          <Link
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            href={`/m/register/${meeting.id}`}
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            打开报名页
          </Link>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="text-base font-semibold text-ink">签到二维码</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            现场摆放该二维码。已报名用户确认签到，未报名用户补报名后自动签到。
          </p>
          <div className="mt-4 flex justify-center rounded-lg border border-slate-200 bg-white p-4">
            <Image
              alt={`${meeting.title} 签到二维码`}
              height={220}
              src={checkinQrCode}
              width={220}
              unoptimized
            />
          </div>
          <p className="mt-4 break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {checkinUrl}
          </p>
          <Link
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            href={`/m/checkin/${meeting.id}`}
            target="_blank"
          >
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            打开签到页
          </Link>
        </article>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-ink">会议信息</h2>
        <dl className="mt-5 grid gap-4 md:grid-cols-4">
          <div>
            <dt className="text-sm text-muted">会议时间</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {dateFormatter.format(new Date(meeting.startTime))}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">会议地点</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {meeting.location}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">所属区域</dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {meeting.region ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">会议状态</dt>
            <dd className="mt-1">
              <StatusBadge status={meeting.status} />
            </dd>
          </div>
        </dl>
      </section>

      <DataTableShell
        description="报名和签到共用同一条参会记录，重复签到不会新增记录或重复计数。"
        title={`报名与签到数据（${registrations.length} 人）`}
      >
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">姓名</th>
              <th className="px-5 py-3">单位类型</th>
              <th className="px-5 py-3">单位名称</th>
              <th className="px-5 py-3">职位</th>
              <th className="px-5 py-3">手机号</th>
              <th className="px-5 py-3">用餐</th>
              <th className="px-5 py-3">报名来源</th>
              <th className="px-5 py-3">报名状态</th>
              <th className="px-5 py-3">企微通知</th>
              <th className="px-5 py-3">签到状态</th>
              <th className="px-5 py-3">签到时间</th>
              <th className="px-5 py-3">签到方式</th>
              <th className="px-5 py-3">现场补报名</th>
              <th className="px-5 py-3">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrations.map((registration) => (
              <tr key={registration.id}>
                <td className="px-5 py-4 font-medium text-ink">
                  {registration.name}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {getOrganizationLabel(
                    registration.organizationType,
                    registration.otherOrganizationType,
                    organizationTypeLabels,
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.organizationName}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.position ?? "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.phone}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {mealPreferenceLabels[registration.meal]}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registrationSourceLabels[registration.source]}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registrationStatusLabels[registration.status]}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <WecomNotificationStatus
                    enabled={meeting.enableWecomNotify}
                    job={notificationJobByRegistrationId.get(registration.id)}
                    legacyError={registration.wecomNotifyError}
                    legacyStatus={registration.wecomNotifyStatus}
                  />
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {checkinStatusLabels[registration.checkinStatus]}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.checkinAt
                    ? dateFormatter.format(new Date(registration.checkinAt))
                    : "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.checkinMethod
                    ? checkinMethodLabels[registration.checkinMethod]
                    : "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.isWalkIn ? "是" : "否"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {registration.notes ?? "-"}
                </td>
              </tr>
            ))}
            {registrations.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm text-muted"
                  colSpan={14}
                >
                  暂无报名和签到数据。可以先使用报名二维码收集参会信息。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>
    </div>
  );
}
