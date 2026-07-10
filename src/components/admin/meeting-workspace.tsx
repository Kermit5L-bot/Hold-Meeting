"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Plus, Search, Trash2, Users, X } from "lucide-react";
import { PrimaryButton } from "@/components/admin/primary-button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  locationTypeLabels,
  locationTypeOptions,
  meetingStatusOptions,
  meetingTypeLabels,
  meetingTypeOptions,
} from "@/lib/meeting-options";
import type {
  ExternalForumMeeting,
  LocationType,
  MarketingCenterMeeting,
  Meeting,
  MeetingFormValues,
  MeetingStatus,
  MeetingType,
  OutreachMeeting,
} from "@/lib/types";
import { dateFormatter } from "@/lib/utils";

type MeetingTypeFilter = "all" | MeetingType;
type MeetingFormMode = "create" | "edit";

interface MeetingFilters {
  year: string;
  type: MeetingTypeFilter;
  businessUnit: string;
  region: string;
}

const currentYear = String(new Date().getFullYear());

const emptyFilters: MeetingFilters = {
  year: currentYear,
  type: "all",
  businessUnit: "",
  region: "",
};

const emptyForm: MeetingFormValues = {
  title: "",
  type: "outreach",
  startTime: "",
  endTime: "",
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

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

function toStoredDateTime(value: string) {
  return value ? `${value}:00+08:00` : "";
}

function buildFormValues(meeting: Meeting): MeetingFormValues {
  return {
    title: meeting.title,
    type: meeting.type,
    startTime: toDateTimeInputValue(meeting.startTime),
    endTime: toDateTimeInputValue(meeting.endTime),
    locationType: meeting.locationType,
    location: meeting.location,
    region: meeting.region ?? "",
    businessUnit: meeting.businessUnit ?? "",
    owner: meeting.owner ?? "",
    status: meeting.status,
    notes: meeting.notes ?? "",
    coverImageUrl: meeting.type === "outreach" ? meeting.coverImageUrl ?? "" : "",
    enableWecomNotify:
      meeting.type === "outreach" ? meeting.enableWecomNotify ?? false : false,
    wecomWebhook: meeting.type === "outreach" ? meeting.wecomWebhook ?? "" : "",
    wecomGroupName:
      meeting.type === "outreach" ? meeting.wecomGroupName ?? "" : "",
    enableWecomCheckinSummaryNotify:
      meeting.type === "outreach"
        ? meeting.enableWecomCheckinSummaryNotify ?? false
        : false,
    wecomCheckinSummaryIntervalMinutes:
      meeting.type === "outreach"
        ? meeting.wecomCheckinSummaryIntervalMinutes ?? 15
        : 15,
  };
}

function createTypedMeeting(
  values: MeetingFormValues,
  existing?: Meeting,
): Meeting {
  const timestamp = new Date().toISOString();
  const base = {
    id:
      existing?.id ??
      `${values.type}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
    title: values.title.trim(),
    type: values.type,
    startTime: toStoredDateTime(values.startTime),
    endTime: values.endTime ? toStoredDateTime(values.endTime) : undefined,
    locationType: values.locationType,
    location: values.location.trim(),
    region: values.region.trim() || undefined,
    businessUnit: values.businessUnit.trim() || undefined,
    owner: values.owner.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (values.type === "outreach") {
    const previous =
      existing?.type === "outreach" ? existing : undefined;
    return {
      ...base,
      type: "outreach",
      registrationEnabled: previous?.registrationEnabled ?? false,
      checkinEnabled: previous?.checkinEnabled ?? false,
      mealEnabled: previous?.mealEnabled ?? false,
      coverImageUrl: values.coverImageUrl.trim() || previous?.coverImageUrl || "",
      enableWecomNotify: previous?.enableWecomNotify ?? false,
      wecomWebhook: previous?.wecomWebhook ?? "",
      wecomGroupName: previous?.wecomGroupName ?? "",
      enableWecomCheckinSummaryNotify:
        previous?.enableWecomCheckinSummaryNotify ?? false,
      wecomCheckinSummaryIntervalMinutes:
        previous?.wecomCheckinSummaryIntervalMinutes ?? 15,
      registrationCount: previous?.registrationCount ?? 0,
      checkinCount: previous?.checkinCount ?? 0,
      walkInCount: previous?.walkInCount ?? 0,
    } satisfies OutreachMeeting;
  }

  if (values.type === "external_forum") {
    const previous =
      existing?.type === "external_forum" ? existing : undefined;
    return {
      ...base,
      type: "external_forum",
      organizer: previous?.organizer ?? "",
      attendees: previous?.attendees ?? [],
      hasSpeech: previous?.hasSpeech ?? false,
      speaker: previous?.speaker,
      speechTopic: previous?.speechTopic,
      cost: previous?.cost ?? 0,
      sponsored: previous?.sponsored ?? false,
    } satisfies ExternalForumMeeting;
  }

  const previous =
    existing?.type === "marketing_center" ? existing : undefined;
  return {
    ...base,
    type: "marketing_center",
    attendees: previous?.attendees ?? [],
    internalMeetingType: previous?.internalMeetingType ?? "例会",
    conclusion: previous?.conclusion,
  } satisfies MarketingCenterMeeting;
}

function getMeetingYear(meeting: Meeting) {
  return new Date(meeting.startTime).getFullYear().toString();
}

function getAvailableYears(meetings: Meeting[]) {
  const years = new Set(meetings.map(getMeetingYear));
  years.add(currentYear);
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function MeetingFormModal({
  mode,
  values,
  onChange,
  onClose,
  onSubmit,
}: {
  mode: MeetingFormMode;
  values: MeetingFormValues;
  onChange: (values: MeetingFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const title = mode === "create" ? "新增会议" : "编辑会议";
  const submitLabel = mode === "create" ? "保存会议" : "保存修改";

  function update<K extends keyof MeetingFormValues>(
    key: K,
    value: MeetingFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div
      aria-labelledby="meeting-form-title"
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
            <h2
              className="text-lg font-semibold text-ink"
              id="meeting-form-title"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              只维护会议主表字段，不包含报名、签到和看板逻辑。
            </p>
          </div>
          <button
            aria-label="关闭会议表单"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
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
            会议类型
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
              name="type"
              onChange={(event) =>
                update("type", event.target.value as MeetingType)
              }
              required
              value={values.type}
            >
              {meetingTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              name="region"
              onChange={(event) => update("region", event.target.value)}
              placeholder="如华东、华南"
              type="text"
              value={values.region}
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            所属部门
            <input
              autoComplete="organization"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="businessUnit"
              onChange={(event) => update("businessUnit", event.target.value)}
              placeholder="请输入部门"
              type="text"
              value={values.businessUnit}
            />
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

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={onClose}
            type="button"
          >
            取消
          </button>
          <button
            className="h-10 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
            type="submit"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirmDialog({
  meeting,
  onCancel,
  onConfirm,
}: {
  meeting: Meeting;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      aria-labelledby="delete-meeting-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="text-lg font-semibold text-ink" id="delete-meeting-title">
          删除会议
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          确认删除“{meeting.title}”？当前阶段使用本地状态，刷新页面后会恢复 mock 数据。
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={onCancel}
            type="button"
          >
            取消
          </button>
          <button
            className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700"
            onClick={onConfirm}
            type="button"
          >
            确认删除
          </button>
        </div>
      </section>
    </div>
  );
}

export function MeetingWorkspace({
  initialMeetings,
  initialType = "all",
  title,
  description,
}: {
  initialMeetings: Meeting[];
  initialType?: MeetingTypeFilter;
  title: string;
  description: string;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [filters, setFilters] = useState<MeetingFilters>({
    ...emptyFilters,
    type: initialType,
  });
  const [formMode, setFormMode] = useState<MeetingFormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<MeetingFormValues>({
    ...emptyForm,
    type: initialType === "all" ? "outreach" : initialType,
  });
  const [pendingDelete, setPendingDelete] = useState<Meeting | null>(null);

  const years = useMemo(() => getAvailableYears(meetings), [meetings]);
  const filteredMeetings = useMemo(() => {
    return meetings.filter((meeting) => {
      const matchesType =
        filters.type === "all" || meeting.type === filters.type;
      const matchesYear = getMeetingYear(meeting) === filters.year;
      const matchesBusinessUnit =
        !filters.businessUnit.trim() ||
        (meeting.businessUnit ?? "")
          .toLowerCase()
          .includes(filters.businessUnit.trim().toLowerCase());
      const matchesRegion =
        !filters.region.trim() ||
        (meeting.region ?? "")
          .toLowerCase()
          .includes(filters.region.trim().toLowerCase());

      return matchesType && matchesYear && matchesBusinessUnit && matchesRegion;
    });
  }, [filters, meetings]);

  function openCreateForm() {
    setEditingId(null);
    setFormValues({
      ...emptyForm,
      type: filters.type === "all" ? "outreach" : filters.type,
    });
    setFormMode("create");
  }

  function openEditForm(meeting: Meeting) {
    setEditingId(meeting.id);
    setFormValues(buildFormValues(meeting));
    setFormMode("edit");
  }

  function closeForm() {
    setFormMode(null);
    setEditingId(null);
  }

  function saveMeeting() {
    const existing = editingId
      ? meetings.find((meeting) => meeting.id === editingId)
      : undefined;
    const nextMeeting = createTypedMeeting(formValues, existing);

    setMeetings((current) => {
      if (!existing) {
        return [nextMeeting, ...current];
      }

      return current.map((meeting) =>
        meeting.id === existing.id ? nextMeeting : meeting,
      );
    });
    closeForm();
  }

  function deleteMeeting(meeting: Meeting) {
    setMeetings((current) => current.filter((item) => item.id !== meeting.id));
    setPendingDelete(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">会议主表管理</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            {title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        <PrimaryButton onClick={openCreateForm}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          新增会议
        </PrimaryButton>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-5">
        <label className="grid gap-1 text-sm font-medium text-ink">
          年度
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="year"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                year: event.target.value,
              }))
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
          会议类型
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="meetingType"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value as MeetingTypeFilter,
              }))
            }
            value={filters.type}
          >
            <option value="all">全部</option>
            {meetingTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-ink">
          所属部门
          <input
            autoComplete="organization"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
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
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="region"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                region: event.target.value,
              }))
            }
            placeholder="输入区域"
            type="search"
            value={filters.region}
          />
        </label>

        <div className="flex items-end">
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            onClick={() => setFilters({ ...emptyFilters, type: initialType })}
            type="button"
          >
            <Search aria-hidden="true" className="h-4 w-4" />
            重置筛选
          </button>
        </div>
      </form>

      <DataTableShell
        description="当前为前端本地状态 CRUD，后续接入数据库后会替换为真实数据。"
        title={`会议列表（${filteredMeetings.length} 条）`}
      >
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">会议主题</th>
              <th className="px-5 py-3">会议类型</th>
              <th className="px-5 py-3">开始时间</th>
              <th className="px-5 py-3">结束时间</th>
              <th className="px-5 py-3">地点</th>
              <th className="px-5 py-3">区域</th>
              <th className="px-5 py-3">部门</th>
              <th className="px-5 py-3">负责人</th>
              <th className="px-5 py-3">状态</th>
              <th className="px-5 py-3">更新时间</th>
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMeetings.map((meeting) => (
              <tr key={meeting.id}>
                <td className="max-w-64 px-5 py-4 font-medium text-ink">
                  {meeting.title}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meetingTypeLabels[meeting.type]}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {dateFormatter.format(new Date(meeting.startTime))}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {meeting.endTime
                    ? dateFormatter.format(new Date(meeting.endTime))
                    : "-"}
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
                <td className="px-5 py-4">
                  <StatusBadge status={meeting.status} />
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {dateFormatter.format(new Date(meeting.updatedAt))}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    {meeting.type === "outreach" ? (
                      <Link
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-brand/30 px-3 text-sm font-medium text-brand transition-colors duration-150 hover:bg-brand/5"
                        href={`/admin/outreach-meetings/${meeting.id}`}
                      >
                        <Users aria-hidden="true" className="h-4 w-4" />
                        报名
                      </Link>
                    ) : null}
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                      onClick={() => openEditForm(meeting)}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                      编辑
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
                      onClick={() => setPendingDelete(meeting)}
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
                <td className="px-5 py-10 text-center text-sm text-muted" colSpan={11}>
                  没有符合筛选条件的会议。可以重置筛选或新增会议。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>

      {formMode ? (
        <MeetingFormModal
          mode={formMode}
          onChange={setFormValues}
          onClose={closeForm}
          onSubmit={saveMeeting}
          values={formValues}
        />
      ) : null}

      {pendingDelete ? (
        <DeleteConfirmDialog
          meeting={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteMeeting(pendingDelete)}
        />
      ) : null}
    </div>
  );
}

export function OutreachMeetingWorkspace({
  initialMeetings,
}: {
  initialMeetings: Meeting[];
}) {
  return (
    <MeetingWorkspace
      description="管理外联会议主表信息。本阶段只支持会议记录维护，不包含报名、签到和二维码。"
      initialMeetings={initialMeetings}
      initialType="outreach"
      title="外联会议"
    />
  );
}

export function ExternalForumWorkspace({
  initialMeetings,
}: {
  initialMeetings: Meeting[];
}) {
  return (
    <MeetingWorkspace
      description="管理外部会议&论坛主表信息。本阶段只维护基础会议记录，不包含费用明细和看板统计。"
      initialMeetings={initialMeetings}
      initialType="external_forum"
      title="外部会议&论坛"
    />
  );
}

export function MarketingMeetingWorkspace({
  initialMeetings,
}: {
  initialMeetings: Meeting[];
}) {
  return (
    <MeetingWorkspace
      description="管理营销中心会议主表信息。本阶段只维护基础会议记录，不开发内部会议统计看板。"
      initialMeetings={initialMeetings}
      initialType="marketing_center"
      title="营销中心会议"
    />
  );
}
