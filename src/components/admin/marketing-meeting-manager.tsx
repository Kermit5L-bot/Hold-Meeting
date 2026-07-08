"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { PrimaryButton } from "@/components/admin/primary-button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { locationTypeLabels, locationTypeOptions } from "@/lib/meeting-options";
import {
  internalMeetingTypeLabels,
  internalMeetingTypeOptions,
} from "@/lib/marketing-meeting-options";
import type {
  InternalMeetingType,
  LocationType,
  MarketingMeetingFormValues,
  MarketingMeetingRecord,
} from "@/lib/types";
import type { SelectOption } from "@/lib/settings-options";
import { dateFormatter, numberFormatter } from "@/lib/utils";

interface Filters {
  year: string;
  businessUnit: string;
  meetingType: "all" | InternalMeetingType;
}

const currentYear = String(new Date().getFullYear());

const emptyFilters: Filters = {
  year: currentYear,
  businessUnit: "",
  meetingType: "all",
};

const emptyForm: MarketingMeetingFormValues = {
  title: "",
  businessUnit: "",
  attendeesText: "",
  meetingTime: "",
  locationType: "online",
  onlineUrl: "",
  offlineAddress: "",
  meetingType: "",
  conclusion: "",
  followUp: "",
  notes: "",
};

function toInputDateTime(value: string) {
  return value.slice(0, 16);
}

function buildForm(record: MarketingMeetingRecord): MarketingMeetingFormValues {
  return {
    title: record.title,
    businessUnit: record.businessUnit,
    attendeesText: record.attendees.join("、"),
    meetingTime: toInputDateTime(record.meetingTime),
    locationType: record.locationType,
    onlineUrl: record.onlineUrl ?? "",
    offlineAddress: record.offlineAddress ?? "",
    meetingType: record.meetingType ?? "",
    conclusion: record.conclusion ?? "",
    followUp: record.followUp ?? "",
    notes: record.notes ?? "",
  };
}

function getAvailableYears(records: MarketingMeetingRecord[]) {
  const years = new Set(
    records.map((record) =>
      new Date(record.meetingTime).getFullYear().toString(),
    ),
  );
  years.add(currentYear);
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function MarketingMeetingFormDialog({
  mode,
  values,
  departmentOptions,
  settingMeetingTypeOptions,
  onChange,
  onClose,
  onSubmit,
  error,
}: {
  mode: "create" | "edit";
  values: MarketingMeetingFormValues;
  departmentOptions: SelectOption[];
  settingMeetingTypeOptions: SelectOption[];
  onChange: (values: MarketingMeetingFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string;
}) {
  const title = mode === "create" ? "新增营销中心会议" : "编辑营销中心会议";

  function update<K extends keyof MarketingMeetingFormValues>(
    key: K,
    value: MarketingMeetingFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div
      aria-labelledby="marketing-meeting-form-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <form
        className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-ink" id="marketing-meeting-form-title">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              记录营销中心内部会议、专题会、培训会、复盘会和后续事项。
            </p>
          </div>
          <button
            aria-label="关闭营销中心会议表单"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-medium text-ink">
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
            所属部门
            <input
              autoComplete="organization"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              list="marketing-department-options"
              name="businessUnit"
              onChange={(event) => update("businessUnit", event.target.value)}
              placeholder="请输入部门"
              required
              type="text"
              value={values.businessUnit}
            />
            <datalist id="marketing-department-options">
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            参会人
            <input
              autoComplete="name"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="attendees"
              onChange={(event) => update("attendeesText", event.target.value)}
              placeholder="多人用顿号、逗号或换行分隔"
              required
              type="text"
              value={values.attendeesText}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            会议时间
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="meetingTime"
              onChange={(event) => update("meetingTime", event.target.value)}
              required
              type="datetime-local"
              value={values.meetingTime}
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
            会议类型
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
              name="meetingType"
              onChange={(event) =>
                update(
                  "meetingType",
                  event.target.value as MarketingMeetingFormValues["meetingType"],
                )
              }
              value={values.meetingType}
            >
              <option value="">请选择会议类型</option>
              {(settingMeetingTypeOptions.length
                ? settingMeetingTypeOptions
                : internalMeetingTypeOptions
              ).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {values.locationType === "online" ? (
            <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
              线上会议链接
              <input
                autoComplete="url"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                name="onlineUrl"
                onChange={(event) => update("onlineUrl", event.target.value)}
                placeholder="请输入线上会议链接或会议号"
                required
                type="text"
                value={values.onlineUrl}
              />
            </label>
          ) : (
            <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
              线下会议地址
              <input
                autoComplete="street-address"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                name="offlineAddress"
                onChange={(event) => update("offlineAddress", event.target.value)}
                placeholder="请输入线下会议地址"
                required
                type="text"
                value={values.offlineAddress}
              />
            </label>
          )}

          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            会议结论
            <textarea
              className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink"
              name="conclusion"
              onChange={(event) => update("conclusion", event.target.value)}
              placeholder="记录会议主要结论"
              value={values.conclusion}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            后续事项
            <textarea
              className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink"
              name="followUp"
              onChange={(event) => update("followUp", event.target.value)}
              placeholder="记录待跟进事项"
              value={values.followUp}
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

        {error ? (
          <p className="mx-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
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
            保存
          </button>
        </div>
      </form>
    </div>
  );
}

export function MarketingMeetingManager({
  initialRecords,
  departmentOptions,
  meetingTypeOptions: settingMeetingTypeOptions,
}: {
  initialRecords: MarketingMeetingRecord[];
  departmentOptions: SelectOption[];
  meetingTypeOptions: SelectOption[];
}) {
  const [records, setRecords] = useState(initialRecords);
  const [filters, setFilters] = useState(emptyFilters);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<MarketingMeetingRecord | null>(null);

  const years = useMemo(() => getAvailableYears(records), [records]);
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const year = new Date(record.meetingTime).getFullYear().toString();
      const matchesYear = year === filters.year;
      const matchesBusinessUnit =
        !filters.businessUnit.trim() ||
        record.businessUnit
          .toLowerCase()
          .includes(filters.businessUnit.trim().toLowerCase());
      const matchesMeetingType =
        filters.meetingType === "all" || record.meetingType === filters.meetingType;

      return matchesYear && matchesBusinessUnit && matchesMeetingType;
    });
  }, [filters, records]);
  const onlineCount = filteredRecords.filter(
    (record) => record.locationType === "online",
  ).length;
  const offlineCount = filteredRecords.filter(
    (record) => record.locationType === "offline",
  ).length;
  const attendeeCount = filteredRecords.reduce(
    (sum, record) => sum + record.attendees.length,
    0,
  );

  function openCreate() {
    setError("");
    setEditingId(null);
    setFormValues(emptyForm);
    setFormMode("create");
  }

  function openEdit(record: MarketingMeetingRecord) {
    setError("");
    setEditingId(record.id);
    setFormValues(buildForm(record));
    setFormMode("edit");
  }

  async function saveRecord() {
    setError("");
    const url =
      formMode === "edit" && editingId
        ? `/api/marketing-meetings/${editingId}`
        : "/api/marketing-meetings";
    const response = await fetch(url, {
      method: formMode === "edit" ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValues),
    });
    const data = (await response.json().catch(() => null)) as
      | { message?: string; record?: MarketingMeetingRecord }
      | null;

    if (!response.ok || !data?.record) {
      setError(data?.message ?? "保存失败，请检查后重试。");
      return;
    }

    const savedRecord = data.record;
    setRecords((current) =>
      formMode === "edit"
        ? current.map((record) =>
            record.id === savedRecord.id ? savedRecord : record,
          )
        : [savedRecord, ...current],
    );
    setFormMode(null);
    setEditingId(null);
  }

  async function deleteRecord(record: MarketingMeetingRecord) {
    await fetch(`/api/marketing-meetings/${record.id}`, { method: "DELETE" });
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setPendingDelete(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">内部会议台账</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            营销中心会议
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            记录营销中心内部会议、专题会、协调会、培训会和复盘会，支持筛选、线上线下统计和导出。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvImportDialog
            confirmUrl="/api/import/marketing-meetings/confirm"
            description="导入营销中心内部会议历史台账，导入后会参与线上线下统计和看板分析。"
            previewUrl="/api/import/marketing-meetings/preview"
            templateHref="/admin/import-templates/marketing-meetings"
            title="导入营销中心会议"
          />
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            href="/admin/marketing-meetings/export"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            导出 Excel
          </Link>
          <PrimaryButton onClick={openCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            新增会议
          </PrimaryButton>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">筛选后会议次数</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {numberFormatter.format(filteredRecords.length)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">线上会议</p>
          <p className="mt-2 text-3xl font-semibold text-brand">
            {numberFormatter.format(onlineCount)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">线下会议</p>
          <p className="mt-2 text-3xl font-semibold text-success">
            {numberFormatter.format(offlineCount)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">参会人次</p>
          <p className="mt-2 text-3xl font-semibold text-warning">
            {numberFormatter.format(attendeeCount)}
          </p>
        </article>
      </section>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel md:grid-cols-4">
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
          会议类型
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="meetingType"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                meetingType: event.target.value as Filters["meetingType"],
              }))
            }
            value={filters.meetingType}
          >
            <option value="all">全部</option>
            {(settingMeetingTypeOptions.length
              ? settingMeetingTypeOptions
              : internalMeetingTypeOptions
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
        description="营销中心会议台账独立维护，不包含报名和签到流程。"
        title={`会议记录（${filteredRecords.length} 条）`}
      >
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">会议主题</th>
              <th className="px-5 py-3">部门</th>
              <th className="px-5 py-3">参会人</th>
              <th className="px-5 py-3">时间</th>
              <th className="px-5 py-3">地点</th>
              <th className="px-5 py-3">会议类型</th>
              <th className="px-5 py-3">后续事项</th>
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="max-w-72 px-5 py-4 font-medium text-ink">
                  {record.title}
                </td>
                <td className="px-5 py-4 text-slate-600">{record.businessUnit}</td>
                <td className="px-5 py-4 text-slate-600">
                  {record.attendees.join("、")}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {dateFormatter.format(new Date(record.meetingTime))}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  <span className="mr-2 rounded bg-slate-100 px-2 py-1 text-xs">
                    {locationTypeLabels[record.locationType]}
                  </span>
                  {record.locationType === "online"
                    ? record.onlineUrl
                    : record.offlineAddress}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {record.meetingType
                    ? internalMeetingTypeLabels[record.meetingType]
                    : "-"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {record.followUp ?? "-"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                      onClick={() => openEdit(record)}
                      type="button"
                    >
                      <Edit3 aria-hidden="true" className="h-4 w-4" />
                      编辑
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
                      onClick={() => setPendingDelete(record)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRecords.length === 0 ? (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-muted" colSpan={8}>
                  暂无符合条件的营销中心会议记录。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>

      {formMode ? (
        <MarketingMeetingFormDialog
          departmentOptions={departmentOptions}
          error={error}
          mode={formMode}
          onChange={setFormValues}
          onClose={() => setFormMode(null)}
          onSubmit={saveRecord}
          settingMeetingTypeOptions={settingMeetingTypeOptions}
          values={formValues}
        />
      ) : null}

      {pendingDelete ? (
        <div
          aria-labelledby="delete-marketing-meeting-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2
              className="text-lg font-semibold text-ink"
              id="delete-marketing-meeting-title"
            >
              删除营销中心会议
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              确认删除“{pendingDelete.title}”？删除后将从营销中心会议台账中移除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                className="h-10 rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-md bg-red-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-red-700"
                onClick={() => deleteRecord(pendingDelete)}
                type="button"
              >
                确认删除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
