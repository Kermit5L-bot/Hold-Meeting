"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Edit3, Plus, Search, Trash2, X } from "lucide-react";
import { CsvImportDialog } from "@/components/admin/csv-import-dialog";
import { PrimaryButton } from "@/components/admin/primary-button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { requestJson } from "@/lib/client-json-request";
import {
  costTypeOptions,
  meetingOutputOptions,
} from "@/lib/external-forum-options";
import type {
  AttendancePurpose,
  ExternalForumFormValues,
  ExternalForumRecord,
  MeetingOutput,
} from "@/lib/types";
import type { PublicAdminUser } from "@/lib/admin-users";
import type { SelectOption } from "@/lib/settings-options";
import {
  currencyFormatter,
  dateFormatter,
  getAppYear,
  numberFormatter,
} from "@/lib/utils";

interface Filters {
  year: string;
  businessUnit: string;
  attendee: string;
  hasSpeech: "all" | "yes" | "no";
}

const currentYear = getAppYear(new Date());

const emptyFilters: Filters = {
  year: currentYear,
  businessUnit: "",
  attendee: "",
  hasSpeech: "all",
};

const emptyForm: ExternalForumFormValues = {
  title: "",
  organizer: "",
  meetingTime: "",
  location: "",
  attendeesText: "",
  hasSpeech: "no",
  speechTopic: "",
  speaker: "",
  cost: "",
  costType: "",
  businessUnit: "",
  sponsored: "no",
  sponsorshipType: "",
  purposes: [],
  outputs: [],
  followUp: "",
  notes: "",
};

function toInputDateTime(value: string) {
  return value.slice(0, 16);
}

function buildForm(record: ExternalForumRecord): ExternalForumFormValues {
  return {
    title: record.title,
    organizer: record.organizer,
    meetingTime: toInputDateTime(record.meetingTime),
    location: record.location,
    attendeesText: record.attendees.join("、"),
    hasSpeech: record.hasSpeech ? "yes" : "no",
    speechTopic: record.speechTopic ?? "",
    speaker: record.speaker ?? "",
    cost: record.cost === undefined ? "" : String(record.cost),
    costType: record.costType ?? "",
    businessUnit: record.businessUnit,
    sponsored: record.sponsored ? "yes" : "no",
    sponsorshipType: record.sponsorshipType ?? "",
    purposes: record.purposes,
    outputs: record.outputs,
    followUp: record.followUp ?? "",
    notes: record.notes ?? "",
  };
}

function getAvailableYears(records: ExternalForumRecord[]) {
  const years = new Set(
    records.map((record) => getAppYear(record.meetingTime)).filter(Boolean),
  );
  years.add(currentYear);
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function MultiCheckboxGroup<T extends string>({
  label,
  name,
  options,
  values,
  onChange,
}: {
  label: string;
  name: string;
  options: Array<{ value: T; label: string }>;
  values: T[];
  onChange: (values: T[]) => void;
}) {
  function toggle(value: T) {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  }

  return (
    <fieldset className="grid gap-2 md:col-span-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => (
          <label
            className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
            key={option.value}
          >
            <input
              checked={values.includes(option.value)}
              name={name}
              onChange={() => toggle(option.value)}
              type="checkbox"
              value={option.value}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ForumFormDialog({
  mode,
  values,
  departmentOptions,
  settingCostTypeOptions,
  settingAttendancePurposeOptions,
  settingMeetingOutputOptions,
  onChange,
  onClose,
  onSubmit,
  error,
  submitting,
}: {
  mode: "create" | "edit";
  values: ExternalForumFormValues;
  departmentOptions: SelectOption[];
  settingCostTypeOptions: SelectOption[];
  settingAttendancePurposeOptions: SelectOption[];
  settingMeetingOutputOptions: SelectOption[];
  onChange: (values: ExternalForumFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
  error: string;
  submitting: boolean;
}) {
  const title = mode === "create" ? "新增外部会议&论坛" : "编辑外部会议&论坛";

  function update<K extends keyof ExternalForumFormValues>(
    key: K,
    value: ExternalForumFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div
      aria-labelledby="external-forum-form-title"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
      role="dialog"
    >
      <form
        className="max-h-[90dvh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] backdrop-blur">
          <div>
            <h2 className="text-lg font-semibold text-ink" id="external-forum-form-title">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              记录我司参会、赞助、演讲和费用信息，不涉及外联会议报名签到。
            </p>
          </div>
          <button
            aria-label="关闭外部会议表单"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
            disabled={submitting}
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
            主办单位
            <input
              autoComplete="organization"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="organizer"
              onChange={(event) => update("organizer", event.target.value)}
              placeholder="请输入主办单位"
              required
              type="text"
              value={values.organizer}
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
            会议地点
            <input
              autoComplete="street-address"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              name="location"
              onChange={(event) => update("location", event.target.value)}
              placeholder="请输入会议地点"
              required
              type="text"
              value={values.location}
            />
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
            所属部门
            <input
              autoComplete="organization"
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              list="external-department-options"
              name="businessUnit"
              onChange={(event) => update("businessUnit", event.target.value)}
              placeholder="请输入部门"
              required
              type="text"
              value={values.businessUnit}
            />
            <datalist id="external-department-options">
              {departmentOptions.map((option) => (
                <option key={option.value} value={option.label} />
              ))}
            </datalist>
          </label>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-ink">是否演讲</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
                <input
                  checked={values.hasSpeech === "yes"}
                  name="hasSpeech"
                  onChange={() => update("hasSpeech", "yes")}
                  required
                  type="radio"
                  value="yes"
                />
                是
              </label>
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
                <input
                  checked={values.hasSpeech === "no"}
                  name="hasSpeech"
                  onChange={() => update("hasSpeech", "no")}
                  required
                  type="radio"
                  value="no"
                />
                否
              </label>
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium text-ink">是否赞助</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
                <input
                  checked={values.sponsored === "yes"}
                  name="sponsored"
                  onChange={() => update("sponsored", "yes")}
                  type="radio"
                  value="yes"
                />
                是
              </label>
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-ink">
                <input
                  checked={values.sponsored === "no"}
                  name="sponsored"
                  onChange={() => update("sponsored", "no")}
                  type="radio"
                  value="no"
                />
                否
              </label>
            </div>
          </fieldset>

          {values.hasSpeech === "yes" ? (
            <>
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                演讲题目
                <input
                  autoComplete="off"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                  name="speechTopic"
                  onChange={(event) => update("speechTopic", event.target.value)}
                  placeholder="请输入演讲题目"
                  required
                  type="text"
                  value={values.speechTopic}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium text-ink">
                演讲人
                <input
                  autoComplete="name"
                  className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                  name="speaker"
                  onChange={(event) => update("speaker", event.target.value)}
                  placeholder="请输入演讲人"
                  required
                  type="text"
                  value={values.speaker}
                />
              </label>
            </>
          ) : null}

          <label className="grid gap-1.5 text-sm font-medium text-ink">
            费用
            <input
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
              inputMode="decimal"
              min="0"
              name="cost"
              onChange={(event) => update("cost", event.target.value)}
              placeholder="请输入费用金额"
              type="number"
              value={values.cost}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-ink">
            费用类型
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
              name="costType"
              onChange={(event) =>
                update("costType", event.target.value as ExternalForumFormValues["costType"])
              }
              value={values.costType}
            >
              <option value="">请选择费用类型</option>
              {settingCostTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {values.sponsored === "yes" ? (
            <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
              赞助形式
              <input
                autoComplete="off"
                className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                name="sponsorshipType"
                onChange={(event) => update("sponsorshipType", event.target.value)}
                placeholder="如论坛协办、展位、物料赞助"
                required
                type="text"
                value={values.sponsorshipType}
              />
            </label>
          ) : null}

          <MultiCheckboxGroup<AttendancePurpose>
            label="参会目的"
            name="purposes"
            onChange={(nextValues) => update("purposes", nextValues)}
            options={settingAttendancePurposeOptions}
            values={values.purposes}
          />
          <MultiCheckboxGroup<MeetingOutput>
            label="会议产出"
            name="outputs"
            onChange={(nextValues) => update("outputs", nextValues)}
            options={settingMeetingOutputOptions}
            values={values.outputs}
          />

          <label className="grid gap-1.5 text-sm font-medium text-ink md:col-span-2">
            后续跟进事项
            <textarea
              className="min-h-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-ink"
              name="followUp"
              onChange={(event) => update("followUp", event.target.value)}
              placeholder="记录后续需要推进的事项"
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

export function ExternalForumManager({
  initialRecords,
  departmentOptions,
  costTypeOptions: settingCostTypeOptions,
  attendancePurposeOptions: settingAttendancePurposeOptions,
  meetingOutputOptions: settingMeetingOutputOptions,
  accountId,
  accountOptions,
  showAccountColumn,
}: {
  initialRecords: ExternalForumRecord[];
  departmentOptions: SelectOption[];
  costTypeOptions: SelectOption[];
  attendancePurposeOptions: SelectOption[];
  meetingOutputOptions: SelectOption[];
  accountId: string;
  accountOptions: PublicAdminUser[];
  showAccountColumn: boolean;
}) {
  const [records, setRecords] = useState(initialRecords);
  const costTypeLabelByValue = useMemo(
    () =>
      new Map(
        [...costTypeOptions, ...settingCostTypeOptions].map((option) => [
          option.value,
          option.label,
        ]),
      ),
    [settingCostTypeOptions],
  );
  const meetingOutputLabelByValue = useMemo(
    () =>
      new Map(
        [...meetingOutputOptions, ...settingMeetingOutputOptions].map((option) => [
          option.value,
          option.label,
        ]),
      ),
    [settingMeetingOutputOptions],
  );
  const [filters, setFilters] = useState(emptyFilters);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ExternalForumRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [createOwnerUserId, setCreateOwnerUserId] = useState("");
  const ownerLabels = useMemo(() => new Map(accountOptions.map((item) => [item.id, item.displayName])), [accountOptions]);
  const scopeQuery = `?accountId=${encodeURIComponent(accountId)}`;

  const years = useMemo(() => getAvailableYears(records), [records]);
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const year = getAppYear(record.meetingTime);
      const matchesYear = year === filters.year;
      const matchesBusinessUnit =
        !filters.businessUnit.trim() ||
        record.businessUnit
          .toLowerCase()
          .includes(filters.businessUnit.trim().toLowerCase());
      const matchesAttendee =
        !filters.attendee.trim() ||
        record.attendees.some((attendee) =>
          attendee.toLowerCase().includes(filters.attendee.trim().toLowerCase()),
        );
      const matchesSpeech =
        filters.hasSpeech === "all" ||
        (filters.hasSpeech === "yes" ? record.hasSpeech : !record.hasSpeech);

      return matchesYear && matchesBusinessUnit && matchesAttendee && matchesSpeech;
    });
  }, [filters, records]);
  const totalCost = filteredRecords.reduce(
    (sum, record) => sum + (record.cost ?? 0),
    0,
  );
  const speechCount = filteredRecords.filter((record) => record.hasSpeech).length;
  const sponsoredCount = filteredRecords.filter((record) => record.sponsored).length;

  function openCreate() {
    setError("");
    setEditingId(null);
    setFormValues(emptyForm);
    setFormMode("create");
  }

  function openEdit(record: ExternalForumRecord) {
    setError("");
    setEditingId(record.id);
    setFormValues(buildForm(record));
    setFormMode("edit");
  }

  async function saveRecord() {
    if (saving) return;
    setError("");
    setSaving(true);
    if (formMode === "create" && accountId === "all" && !createOwnerUserId) { setError("请选择数据归属账号。"); setSaving(false); return; }
    const baseUrl =
      formMode === "edit" && editingId
        ? `/api/external-forums/${editingId}`
        : "/api/external-forums";
    const url = `${baseUrl}${scopeQuery}`;
    const result = await requestJson<{ record?: ExternalForumRecord }>(
      url,
      {
        method: formMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValues, ownerUserId: createOwnerUserId || undefined }),
      },
      "保存失败，请检查后重试。",
    );
    setSaving(false);

    if (!result.ok || !result.data?.record) {
      setError(result.ok ? "保存失败，请检查后重试。" : result.message);
      return;
    }

    const savedRecord = result.data.record;
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

  async function deleteRecord(record: ExternalForumRecord) {
    if (deleting) return;
    setError("");
    setDeleting(true);
    const result = await requestJson<{ ok?: boolean }>(
      `/api/external-forums/${record.id}${scopeQuery}`,
      { method: "DELETE" },
      "删除失败，请刷新后重试。",
    );
    setDeleting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setRecords((current) => current.filter((item) => item.id !== record.id));
    setPendingDelete(null);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">外部会议台账</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-ink">
            外部会议&论坛
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            记录我司人员参加、赞助、演讲的外部会议或行业论坛，支持筛选、费用统计和导出。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CsvImportDialog
            accountId={accountId}
            ownerOptions={accountOptions}
            confirmUrl="/api/import/external-forums/confirm"
            description="导入我司参加、赞助、演讲的外部会议或行业论坛历史台账。"
            previewUrl="/api/import/external-forums/preview"
            templateHref="/admin/import-templates/external-forums"
            title="导入外部会议&论坛"
          />
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
            href={`/admin/external-forums/export${scopeQuery}`}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            导出 CSV
          </Link>
          <PrimaryButton onClick={openCreate}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            新增记录
          </PrimaryButton>
        </div>
      </div>
      {accountId === "all" ? <label className="grid max-w-md gap-1 text-sm font-medium">数据归属账号<select autoComplete="off" className="h-10 rounded-md border border-slate-300 bg-white px-3" name="createOwnerUserId" onChange={(event) => setCreateOwnerUserId(event.target.value)} required value={createOwnerUserId}><option value="">请选择</option>{accountOptions.filter((item) => item.status !== "deleted").map((item) => <option key={item.id} value={item.id}>{item.displayName}（{item.username}）</option>)}</select></label> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">筛选后会议场次</p>
          <p className="mt-2 text-3xl font-semibold text-ink">
            {numberFormatter.format(filteredRecords.length)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">费用合计</p>
          <p className="mt-2 text-3xl font-semibold text-brand">
            {currencyFormatter.format(totalCost)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">演讲场次</p>
          <p className="mt-2 text-3xl font-semibold text-success">
            {numberFormatter.format(speechCount)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <p className="text-sm text-muted">赞助场次</p>
          <p className="mt-2 text-3xl font-semibold text-warning">
            {numberFormatter.format(sponsoredCount)}
          </p>
        </article>
      </section>

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
          参会人
          <input
            autoComplete="name"
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="attendee"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                attendee: event.target.value,
              }))
            }
            placeholder="输入参会人"
            type="search"
            value={filters.attendee}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          是否演讲
          <select
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-ink"
            name="hasSpeech"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                hasSpeech: event.target.value as Filters["hasSpeech"],
              }))
            }
            value={filters.hasSpeech}
          >
            <option value="all">全部</option>
            <option value="yes">是</option>
            <option value="no">否</option>
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
        description="外部会议&论坛台账独立维护，不影响外联会议报名签到流程。"
        title={`会议记录（${filteredRecords.length} 条）`}
      >
        <table className="w-full min-w-[1320px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">会议主题</th>
              <th className="px-5 py-3">主办单位</th>
              <th className="px-5 py-3">时间</th>
              <th className="px-5 py-3">地点</th>
              <th className="px-5 py-3">参会人</th>
              <th className="px-5 py-3">演讲</th>
              <th className="px-5 py-3">费用</th>
              <th className="px-5 py-3">部门</th>
              <th className="px-5 py-3">赞助</th>
              <th className="px-5 py-3">会议产出</th>
              {showAccountColumn ? <th className="px-5 py-3">数据账号</th> : null}
              <th className="px-5 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRecords.map((record) => (
              <tr key={record.id}>
                <td className="max-w-72 px-5 py-4 font-medium text-ink">
                  {record.title}
                </td>
                <td className="px-5 py-4 text-slate-600">{record.organizer}</td>
                <td className="px-5 py-4 text-slate-600">
                  {dateFormatter.format(new Date(record.meetingTime))}
                </td>
                <td className="px-5 py-4 text-slate-600">{record.location}</td>
                <td className="px-5 py-4 text-slate-600">
                  {record.attendees.join("、")}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {record.hasSpeech
                    ? `${record.speaker ?? "-"}：${record.speechTopic ?? "-"}`
                    : "否"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {record.cost === undefined
                    ? "-"
                    : `${currencyFormatter.format(record.cost)}${
                        record.costType
                          ? ` / ${costTypeLabelByValue.get(record.costType) ?? record.costType}`
                          : ""
                      }`}
                </td>
                <td className="px-5 py-4 text-slate-600">{record.businessUnit}</td>
                <td className="px-5 py-4 text-slate-600">
                  {record.sponsored ? record.sponsorshipType ?? "是" : "否"}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {record.outputs.length
                    ? record.outputs
                        .map(
                          (output) =>
                            meetingOutputLabelByValue.get(output) ?? output,
                        )
                        .join("、")
                    : "-"}
                </td>
                {showAccountColumn ? <td className="px-5 py-4 text-slate-600">{ownerLabels.get(record.ownerUserId) ?? "已删除账号"}</td> : null}
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
                      onClick={() => {
                        setError("");
                        setPendingDelete(record);
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
            {filteredRecords.length === 0 ? (
              <tr>
                <td className="px-5 py-10 text-center text-sm text-muted" colSpan={showAccountColumn ? 12 : 11}>
                  暂无符合条件的外部会议记录。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </DataTableShell>

      {formMode ? (
        <ForumFormDialog
          departmentOptions={departmentOptions}
          error={error}
          mode={formMode}
          onChange={setFormValues}
          onClose={() => setFormMode(null)}
          onSubmit={saveRecord}
          settingCostTypeOptions={settingCostTypeOptions}
          settingAttendancePurposeOptions={settingAttendancePurposeOptions}
          settingMeetingOutputOptions={settingMeetingOutputOptions}
          submitting={saving}
          values={formValues}
        />
      ) : null}

      {pendingDelete ? (
        <div
          aria-labelledby="delete-external-forum-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2
              className="text-lg font-semibold text-ink"
              id="delete-external-forum-title"
            >
              删除外部会议记录
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              确认删除“{pendingDelete.title}”？删除后将从外部会议台账中移除。
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
                onClick={() => deleteRecord(pendingDelete)}
                type="button"
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
