"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bell, Edit3, ImagePlus, Plus, Search, Trash2, Users, X } from "lucide-react";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { PrimaryButton } from "@/components/admin/primary-button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { requestJson } from "@/lib/client-json-request";
import {
  locationTypeLabels,
  locationTypeOptions,
  meetingStatusOptions,
} from "@/lib/meeting-options";
import type {
  LocationType,
  MeetingFormValues,
  MeetingStatus,
  OutreachMeeting,
} from "@/lib/types";
import type { PublicAdminUser } from "@/lib/admin-users";
import type { SelectOption } from "@/lib/settings-options";
import { dateFormatter, getAppYear } from "@/lib/utils";

interface Filters {
  year: string;
  businessUnit: string;
  region: string;
}

const currentYear = getAppYear(new Date());

const emptyFilters: Filters = {
  year: currentYear,
  businessUnit: "",
  region: "",
};

const emptyForm: MeetingFormValues = {
  title: "",
  type: "outreach",
  startTime: "",
  endTime: "",
  registrationDeadline: "",
  locationType: "offline",
  location: "",
  region: "",
  businessUnit: "",
  owner: "",
  status: "draft",
  notes: "",
  coverImageUrl: "",
  enableWecomNotify: false,
  wecomWebhook: "",
  wecomGroupName: "",
  enableWecomCheckinSummaryNotify: false,
  wecomCheckinSummaryIntervalMinutes: 15,
};

function toInputDateTime(value?: string) {
  return value ? value.slice(0, 16) : "";
}

function buildForm(meeting: OutreachMeeting): MeetingFormValues {
  return {
    title: meeting.title,
    type: "outreach",
    startTime: toInputDateTime(meeting.startTime),
    endTime: toInputDateTime(meeting.endTime),
    registrationDeadline: toInputDateTime(meeting.registrationDeadline),
    locationType: meeting.locationType,
    location: meeting.location,
    region: meeting.region ?? "",
    businessUnit: meeting.businessUnit ?? "",
    owner: meeting.owner ?? "",
    status: meeting.status,
    notes: meeting.notes ?? "",
    coverImageUrl: meeting.coverImageUrl ?? "",
    enableWecomNotify: meeting.enableWecomNotify ?? false,
    wecomWebhook: meeting.wecomWebhook ?? "",
    wecomGroupName: meeting.wecomGroupName ?? "",
    enableWecomCheckinSummaryNotify:
      meeting.enableWecomCheckinSummaryNotify ?? false,
    wecomCheckinSummaryIntervalMinutes:
      meeting.wecomCheckinSummaryIntervalMinutes ?? 15,
  };
}

function getAvailableYears(meetings: OutreachMeeting[]) {
  const years = new Set(
    meetings.map((meeting) => getAppYear(meeting.startTime)).filter(Boolean),
  );
  years.add(currentYear);
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function CoverUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    setPreviewFailed(false);
  }, [value]);

  async function uploadCover(file: File) {
    setError("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("仅支持 JPG、PNG、WEBP 格式。");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError("图片大小不能超过 3MB。");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const result = await requestJson<{ url?: string; message?: string }>(
      "/api/uploads/outreach-cover",
      {
      method: "POST",
      body: formData,
      },
      "上传失败，请更换图片后重试。",
    );

    setUploading(false);

    if (!result.ok || !result.data?.url) {
      setError(result.ok ? "上传失败，请更换图片后重试。" : result.message);
      return;
    }

    onChange(result.data.url);
  }

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:col-span-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">会议头图</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            推荐尺寸：1200 × 540 px 或 750 × 340 px；推荐比例：约 16:7 或 2:1；支持格式：JPG、PNG、WEBP；建议大小：3MB 以内。
          </p>
        </div>
        <ImagePlus aria-hidden="true" className="mt-0.5 h-5 w-5 text-brand" />
      </div>

      {value && !previewFailed ? (
        <div className="relative h-36 overflow-hidden rounded-md border border-slate-200 bg-white">
          <Image
            alt="会议头图预览"
            className="object-cover"
            fill
            onError={() => setPreviewFailed(true)}
            sizes="(max-width: 768px) 100vw, 768px"
            src={value}
            unoptimized
          />
        </div>
      ) : value ? (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-amber-300 bg-amber-50 px-4 text-center text-sm text-amber-800">
          头图已上传，但当前地址暂时无法预览。请重试或联系运维检查图片读取服务。
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-gradient-to-r from-blue-50 via-slate-50 to-emerald-50 text-sm text-muted">
          未上传头图，将在移动端使用默认背景
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700">
          {uploading ? "上传中..." : value ? "替换图片" : "上传图片"}
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            name="coverImageFile"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void uploadCover(file);
            }}
            type="file"
          />
        </label>
        {value ? (
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={() => {
              setError("");
              onChange("");
            }}
            type="button"
          >
            删除头图
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function OutreachFormDialog({
  mode,
  values,
  departmentOptions,
  regionOptions,
  onChange,
  onClose,
  onSubmit,
  error,
  submitting,
}: {
  mode: "create" | "edit";
  values: MeetingFormValues;
  departmentOptions: SelectOption[];
  regionOptions: SelectOption[];
  onChange: (values: MeetingFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string;
  submitting: boolean;
}) {
  const title = mode === "create" ? "新增外联会议" : "编辑外联会议";

  function update<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div
      aria-labelledby="outreach-form-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <form
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-ink" id="outreach-form-title">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              创建后可进入详情页获取报名二维码、签到二维码，并查看报名签到数据。
            </p>
          </div>
          <button
            aria-label="关闭外联会议表单"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            会议主题
            <input
              autoComplete="off"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="title"
              onChange={(event) => update("title", event.target.value)}
              placeholder="请输入会议主题"
              required
              type="text"
              value={values.title}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议开始时间
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="startTime"
              onChange={(event) => update("startTime", event.target.value)}
              required
              type="datetime-local"
              value={values.startTime}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议结束时间
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="endTime"
              onChange={(event) => update("endTime", event.target.value)}
              type="datetime-local"
              value={values.endTime}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            报名截止时间
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="registrationDeadline"
              onChange={(event) =>
                update("registrationDeadline", event.target.value)
              }
              type="datetime-local"
              value={values.registrationDeadline}
            />
            <span className="text-xs font-normal leading-5 text-muted">
              选填；未填写时，以会议开始时间作为报名截止时间。
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议地点类型
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
              name="locationType"
              onChange={(event) =>
                update("locationType", event.target.value as LocationType)
              }
              required
              value={values.locationType}
            >
              {locationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议地点
            <input
              autoComplete="street-address"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="location"
              onChange={(event) => update("location", event.target.value)}
              placeholder={values.locationType === "online" ? "会议链接" : "线下地址"}
              required
              type="text"
              value={values.location}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            所属区域
            <input
              autoComplete="off"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              list="outreach-region-options"
              name="region"
              onChange={(event) => update("region", event.target.value)}
              placeholder="如华东、华南"
              type="text"
              value={values.region}
            />
            <datalist id="outreach-region-options">
              {regionOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            所属部门
            <input
              autoComplete="organization"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              list="outreach-department-options"
              name="businessUnit"
              onChange={(event) => update("businessUnit", event.target.value)}
              placeholder="请输入部门"
              type="text"
              value={values.businessUnit}
            />
            <datalist id="outreach-department-options">
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议负责人
            <input
              autoComplete="name"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="owner"
              onChange={(event) => update("owner", event.target.value)}
              placeholder="请输入负责人"
              type="text"
              value={values.owner}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议状态
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
              name="status"
              onChange={(event) =>
                update("status", event.target.value as MeetingStatus)
              }
              required
              value={values.status}
            >
              {meetingStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <CoverUploadField
            onChange={(coverImageUrl) => update("coverImageUrl", coverImageUrl)}
            value={values.coverImageUrl}
          />

          <section className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4 md:col-span-2">
            <div className="flex items-start gap-3">
              <Bell aria-hidden="true" className="mt-0.5 h-4 w-4 text-brand" />
              <div>
                <h3 className="text-sm font-semibold text-ink">企业微信报名群通知</h3>
                <p className="mt-1 text-xs leading-5 text-muted">
                  开启后，会前报名成功和现场补报名并签到成功会推送到配置的企业微信群。普通签到成功不会逐人推送，可单独开启签到进度汇总。
                </p>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input
                checked={values.enableWecomNotify}
                name="enableWecomNotify"
                onChange={(event) =>
                  update("enableWecomNotify", event.target.checked)
                }
                type="checkbox"
              />
              开启企业微信通知
            </label>
            {values.enableWecomNotify ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
                  企业微信机器人 Webhook
                  <input
                    autoComplete="off"
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                    name="wecomWebhook"
                    onChange={(event) => update("wecomWebhook", event.target.value)}
                    placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
                    required={values.enableWecomNotify}
                    type="url"
                    value={values.wecomWebhook}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
                  通知群名称
                  <input
                    autoComplete="off"
                    className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                    name="wecomGroupName"
                    onChange={(event) => update("wecomGroupName", event.target.value)}
                    placeholder="选填，仅后台识别用"
                    type="text"
                    value={values.wecomGroupName}
                  />
                </label>
                <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:col-span-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                      checked={values.enableWecomCheckinSummaryNotify}
                      name="enableWecomCheckinSummaryNotify"
                      onChange={(event) =>
                        update(
                          "enableWecomCheckinSummaryNotify",
                          event.target.checked,
                        )
                      }
                      type="checkbox"
                    />
                    开启签到进度汇总通知
                  </label>
                  <p className="text-xs leading-5 text-muted">
                    开启后，仅在会议开始前 60 分钟到开始后 30 分钟内按频率推送；已签到人数无变化不推送，到场率 100% 后停止。
                  </p>
                  {values.enableWecomCheckinSummaryNotify ? (
                    <label className="grid gap-1.5 text-sm font-medium text-ink">
                      汇总频率
                      <select
                        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
                        name="wecomCheckinSummaryIntervalMinutes"
                        onChange={(event) =>
                          update(
                            "wecomCheckinSummaryIntervalMinutes",
                            Number(event.target.value) as 10 | 15 | 30,
                          )
                        }
                        value={values.wecomCheckinSummaryIntervalMinutes}
                      >
                        <option value={10}>每 10 分钟</option>
                        <option value={15}>每 15 分钟</option>
                        <option value={30}>每 30 分钟</option>
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>

          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            备注
            <textarea
              className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink"
              name="notes"
              onChange={(event) => update("notes", event.target.value)}
              placeholder="补充说明"
              value={values.notes}
            />
          </label>
        </div>

        {error ? (
          <p
            className="mx-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={submitting}
            type="submit"
          >
            {submitting ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function OutreachMeetingManager({
  initialMeetings,
  departmentOptions,
  regionOptions,
  accountId,
  accountOptions,
  showAccountColumn,
}: {
  initialMeetings: OutreachMeeting[];
  departmentOptions: SelectOption[];
  regionOptions: SelectOption[];
  accountId: string;
  accountOptions: PublicAdminUser[];
  showAccountColumn: boolean;
}) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [filters, setFilters] = useState(emptyFilters);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<OutreachMeeting | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createOwnerUserId, setCreateOwnerUserId] = useState("");
  const ownerLabels = useMemo(() => new Map(accountOptions.map((item) => [item.id, item.displayName])), [accountOptions]);
  const scopeQuery = `?accountId=${encodeURIComponent(accountId)}`;

  useEffect(() => {
    setMeetings(initialMeetings);
  }, [initialMeetings]);

  const years = useMemo(() => getAvailableYears(meetings), [meetings]);
  const filteredMeetings = useMemo(
    () =>
      meetings.filter((meeting) => {
        const year = getAppYear(meeting.startTime);
        return (
          year === filters.year &&
          (!filters.businessUnit.trim() ||
            (meeting.businessUnit ?? "").includes(filters.businessUnit.trim())) &&
          (!filters.region.trim() ||
            (meeting.region ?? "").includes(filters.region.trim()))
        );
      }),
    [filters, meetings],
  );

  function openCreate() {
    setError("");
    setEditingId(null);
    setFormValues(emptyForm);
    setFormMode("create");
  }

  function openEdit(meeting: OutreachMeeting) {
    setError("");
    setEditingId(meeting.id);
    setFormValues(buildForm(meeting));
    setFormMode("edit");
  }

  async function saveMeeting() {
    if (saving) return;
    setError("");
    setSaving(true);
    if (formMode === "create" && accountId === "all" && !createOwnerUserId) { setError("请选择数据归属账号。"); setSaving(false); return; }
    const baseUrl =
      formMode === "edit" && editingId
        ? `/api/outreach-meetings/${editingId}`
        : "/api/outreach-meetings";
    const url = `${baseUrl}${scopeQuery}`;
    const result = await requestJson<{ meeting?: OutreachMeeting }>(
      url,
      {
        method: formMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValues, ownerUserId: createOwnerUserId || undefined }),
      },
      "保存失败，请检查后重试。",
    );
    setSaving(false);

    if (!result.ok || !result.data?.meeting) {
      setError(result.ok ? "保存失败，请检查后重试。" : result.message);
      return;
    }

    const savedMeeting = result.data.meeting;
    setMeetings((current) =>
      formMode === "edit"
        ? current.map((meeting) =>
            meeting.id === savedMeeting.id ? savedMeeting : meeting,
          )
        : [savedMeeting, ...current],
    );
    router.refresh();
    setFormMode(null);
    setEditingId(null);
  }

  async function deleteMeeting(meeting: OutreachMeeting) {
    if (deleting) return;
    setError("");
    setDeleting(true);
    const result = await requestJson<{ ok?: boolean }>(
      `/api/outreach-meetings/${meeting.id}${scopeQuery}`,
      { method: "DELETE" },
      "删除失败，请刷新后重试。",
    );
    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMeetings((current) => current.filter((item) => item.id !== meeting.id));
    router.refresh();
    setPendingDelete(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">外联会议管理</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            外联会议 / 我司承办会议
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            创建外联会议后，可进入详情页获取报名二维码、签到二维码，并查看报名签到数据。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvImportDialog
            accountId={accountId}
            ownerOptions={accountOptions}
            confirmUrl="/api/import/outreach-meetings/confirm"
            description="完整保留模板表头并删除示例行后填写，时间使用 YYYY-MM-DD HH:mm。历史导入编号须唯一。"
            previewUrl="/api/import/outreach-meetings/preview"
            templateHref="/admin/import-templates/outreach-meetings"
            title="导入外联会议主表"
            triggerLabel="导入会议"
          />
          <CsvImportDialog
            accountId={accountId}
            ownerOptions={accountOptions}
            confirmUrl="/api/import/outreach-registrations/confirm"
            description="完整保留模板表头并删除示例行。会议编号可填写列表中的系统编号，也兼容旧模板的会议历史导入编号。"
            previewUrl="/api/import/outreach-registrations/preview"
            templateHref="/admin/import-templates/outreach-registrations"
            title="导入报名签到明细"
            triggerLabel="导入报名签到"
          />
          <PrimaryButton onClick={openCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            新增外联会议
          </PrimaryButton>
        </div>
      </div>
      {accountId === "all" ? <label className="grid max-w-md gap-1 text-sm font-medium">数据归属账号<select autoComplete="off" className="h-10 rounded-md border border-slate-300 bg-white px-3" name="createOwnerUserId" onChange={(event) => setCreateOwnerUserId(event.target.value)} required value={createOwnerUserId}><option value="">请选择</option>{accountOptions.filter((item) => item.status !== "deleted").map((item) => <option key={item.id} value={item.id}>{item.displayName}（{item.username}）</option>)}</select></label> : null}

      <form
        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-4"
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
          所属部门
          <input
            autoComplete="organization"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
            name="businessUnit"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                businessUnit: event.target.value,
              }))
            }
            placeholder="输入部门"
            type="search"
            value={filters.businessUnit}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          区域
          <input
            autoComplete="off"
            className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
            name="region"
            onChange={(event) =>
              setFilters((current) => ({ ...current, region: event.target.value }))
            }
            placeholder="输入区域"
            type="search"
            value={filters.region}
          />
        </label>
        <div className="flex items-end">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={() => setFilters(emptyFilters)}
            type="button"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            重置筛选
          </button>
        </div>
      </form>

      <DataTableShell
        description="外联会议记录保存后会立即用于报名二维码、签到二维码和看板统计。"
        title={`外联会议列表（${filteredMeetings.length} 条）`}
      >
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">会议主题</th>
              <th className="px-5 py-3">时间</th>
              <th className="px-5 py-3">地点</th>
              <th className="px-5 py-3">区域</th>
              <th className="px-5 py-3">部门</th>
              <th className="px-5 py-3">负责人</th>
              <th className="px-5 py-3">头图</th>
              <th className="px-5 py-3">企业微信通知</th>
              <th className="px-5 py-3">状态</th>
              {showAccountColumn ? <th className="px-5 py-3">数据账号</th> : null}
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMeetings.map((meeting) => (
              <tr key={meeting.id}>
                <td className="max-w-64 px-5 py-4 text-ink">
                  <p className="font-medium">{meeting.title}</p>
                  <p className="mt-1 break-all font-mono text-xs font-normal text-slate-500">
                    编号：{meeting.id}
                  </p>
                  {meeting.importKey ? (
                    <p className="mt-1 break-all text-xs font-normal text-slate-500">
                      历史编号：{meeting.importKey}
                    </p>
                  ) : null}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {dateFormatter.format(new Date(meeting.startTime))}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <span className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs">
                    {locationTypeLabels[meeting.locationType]}
                  </span>
                  {meeting.location}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.region ?? "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.businessUnit ?? "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.owner ?? "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.coverImageUrl ? "已上传" : "默认背景"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.enableWecomNotify
                    ? meeting.wecomGroupName || "已开启"
                    : "未开启"}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={meeting.status} />
                </td>
                {showAccountColumn ? <td className="px-5 py-4 text-slate-600">{ownerLabels.get(meeting.ownerUserId) ?? "已删除账号"}</td> : null}
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <Link
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-brand/30 px-3 text-sm font-medium text-brand transition-colors duration-150 hover:bg-brand/5"
                      href={`/admin/outreach-meetings/${meeting.id}${scopeQuery}`}
                    >
                      <Users aria-hidden="true" className="h-4 w-4" />
                      报名签到
                    </Link>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                      onClick={() => openEdit(meeting)}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                      编辑
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
                      onClick={() => {
                        setError("");
                        setPendingDelete(meeting);
                      }}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredMeetings.length === 0 ? (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-muted" colSpan={showAccountColumn ? 11 : 10}>
                  暂无符合条件的外联会议。可以重置筛选或新增会议。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>

      {formMode ? (
        <OutreachFormDialog
          departmentOptions={departmentOptions}
          error={error}
          mode={formMode}
          onChange={setFormValues}
          onClose={() => setFormMode(null)}
          onSubmit={saveMeeting}
          regionOptions={regionOptions}
          submitting={saving}
          values={formValues}
        />
      ) : null}

      {pendingDelete ? (
        <div
          aria-labelledby="delete-outreach-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-ink" id="delete-outreach-title">
              删除外联会议
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              确认删除“{pendingDelete.title}”？已有报名或签到数据的会议不能删除，可改为已归档。
            </p>
            {error ? (
              <p
                className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={deleting}
                onClick={() => deleteMeeting(pendingDelete)}
                type="button"
              >
                {deleting ? "删除中..." : "确认删除"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
