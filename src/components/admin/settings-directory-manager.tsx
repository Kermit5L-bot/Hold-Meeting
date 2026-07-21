"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { requestJson } from "@/lib/client-json-request";
import {
  categoryDescriptions,
  categoryLabels,
  settingsCategories,
} from "@/lib/settings-constants";
import type { SettingsCategory, SettingsOption } from "@/lib/types";
import { cn } from "@/lib/utils";

function sortedCategoryOptions(options: SettingsOption[], category: SettingsCategory) {
  return options
    .filter((option) => option.category === category)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "zh-Hans-CN"),
    );
}

function reorderOptions(
  options: SettingsOption[],
  category: SettingsCategory,
  sourceId: string,
  targetId: string,
) {
  const categoryOptions = sortedCategoryOptions(options, category);
  const sourceIndex = categoryOptions.findIndex((option) => option.id === sourceId);
  const targetIndex = categoryOptions.findIndex((option) => option.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return options;

  const reordered = [...categoryOptions];
  const [moved] = reordered.splice(sourceIndex, 1);
  reordered.splice(targetIndex, 0, moved);
  const sortOrderById = new Map(
    reordered.map((option, index) => [option.id, index * 10]),
  );

  return options.map((option) => {
    const sortOrder = sortOrderById.get(option.id);
    return sortOrder === undefined ? option : { ...option, sortOrder };
  });
}

interface DragState {
  id: string;
  category: SettingsCategory;
  originalOptions: SettingsOption[];
  dropped: boolean;
}

export function SettingsDirectoryManager({
  activeCategory,
  initialOptions,
}: {
  activeCategory: SettingsCategory;
  initialOptions: SettingsOption[];
}) {
  const [options, setOptions] = useState(initialOptions);
  const latestOptionsRef = useRef(initialOptions);
  const dragStateRef = useRef<DragState | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<SettingsOption>>>({});
  const [newLabels, setNewLabels] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        settingsCategories.map((category) => [
          category,
          sortedCategoryOptions(options, category),
        ]),
      ) as Record<SettingsCategory, SettingsOption[]>,
    [options],
  );
  const activeOptions = grouped[activeCategory];
  const busy = submitting || reordering;

  function replaceOptions(nextOptions: SettingsOption[]) {
    latestOptionsRef.current = nextOptions;
    setOptions(nextOptions);
  }

  function updateDraft(id: string, values: Partial<SettingsOption>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...values },
    }));
  }

  async function saveOption(option: SettingsOption) {
    if (busy) return;
    setMessage("");
    setSubmitting(true);
    const draft = drafts[option.id] ?? {};
    const result = await requestJson<{ option?: SettingsOption }>(
      `/api/settings/${option.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label ?? option.label,
          enabled: draft.enabled ?? option.enabled,
        }),
      },
      "保存失败。",
    );
    setSubmitting(false);

    if (!result.ok || !result.data?.option) {
      setMessage(result.ok ? "保存失败。" : result.message);
      return;
    }

    replaceOptions(
      latestOptionsRef.current.map((item) =>
        item.id === option.id ? result.data!.option! : item,
      ),
    );
    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[option.id];
      return nextDrafts;
    });
    setMessage("配置已保存。");
  }

  async function createOption(category: SettingsCategory) {
    if (busy) return;
    setMessage("");
    const label = newLabels[category]?.trim() ?? "";

    if (!label) {
      setMessage("请填写新增配置名称。");
      return;
    }

    setSubmitting(true);
    const result = await requestJson<{ option?: SettingsOption }>(
      "/api/settings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, label }),
      },
      "新增失败。",
    );
    setSubmitting(false);

    if (!result.ok || !result.data?.option) {
      setMessage(result.ok ? "新增失败。" : result.message);
      return;
    }

    replaceOptions([...latestOptionsRef.current, result.data.option]);
    setNewLabels((current) => ({ ...current, [category]: "" }));
    setMessage("配置已新增。");
  }

  async function deleteOption(option: SettingsOption) {
    if (busy) return;
    if (
      !window.confirm(
        `确定删除“${option.label}”吗？该选项将不再用于新建数据，已有业务记录不会被删除。`,
      )
    ) {
      return;
    }
    setMessage("");
    setSubmitting(true);
    const result = await requestJson<{ ok?: boolean }>(
      `/api/settings/${option.id}`,
      { method: "DELETE" },
      "删除失败。",
    );
    setSubmitting(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    replaceOptions(
      latestOptionsRef.current.filter((item) => item.id !== option.id),
    );
    setMessage("配置已删除。");
  }

  async function persistOrder(
    category: SettingsCategory,
    nextOptions: SettingsOption[],
    fallbackOptions: SettingsOption[],
  ) {
    setMessage("");
    setReordering(true);
    const orderedIds = sortedCategoryOptions(nextOptions, category).map(
      (option) => option.id,
    );
    const result = await requestJson<{ options?: SettingsOption[] }>(
      "/api/settings",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, orderedIds }),
      },
      "排序保存失败。",
    );
    setReordering(false);

    if (!result.ok || !result.data?.options) {
      replaceOptions(fallbackOptions);
      setMessage(result.ok ? "排序保存失败。" : result.message);
      return;
    }

    const savedById = new Map(
      result.data.options.map((option) => [option.id, option]),
    );
    replaceOptions(
      latestOptionsRef.current.map((option) => savedById.get(option.id) ?? option),
    );
    setMessage("展示顺序已保存。");
  }

  function moveOption(optionId: string, direction: -1 | 1) {
    if (busy) return;
    const originalOptions = latestOptionsRef.current;
    const categoryOptions = sortedCategoryOptions(originalOptions, activeCategory);
    const sourceIndex = categoryOptions.findIndex((option) => option.id === optionId);
    const target = categoryOptions[sourceIndex + direction];

    if (sourceIndex < 0 || !target) return;
    const nextOptions = reorderOptions(
      originalOptions,
      activeCategory,
      optionId,
      target.id,
    );
    replaceOptions(nextOptions);
    void persistOrder(activeCategory, nextOptions, originalOptions);
  }

  function handleDragStart(option: SettingsOption) {
    if (busy) return;
    dragStateRef.current = {
      id: option.id,
      category: option.category,
      originalOptions: latestOptionsRef.current,
      dropped: false,
    };
    setDraggingId(option.id);
  }

  function handleDragOver(target: SettingsOption) {
    const dragState = dragStateRef.current;
    if (
      !dragState ||
      dragState.category !== target.category ||
      dragState.id === target.id
    ) {
      return;
    }

    replaceOptions(
      reorderOptions(
        latestOptionsRef.current,
        target.category,
        dragState.id,
        target.id,
      ),
    );
  }

  function handleDrop() {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    dragState.dropped = true;
    const nextOptions = latestOptionsRef.current;
    setDraggingId(null);
    void persistOrder(
      dragState.category,
      nextOptions,
      dragState.originalOptions,
    );
    dragStateRef.current = null;
  }

  function handleDragEnd() {
    const dragState = dragStateRef.current;
    if (dragState && !dragState.dropped) {
      replaceOptions(dragState.originalOptions);
    }
    dragStateRef.current = null;
    setDraggingId(null);
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        description="按业务字典分类维护配置项。调整后的顺序会同步用于列表筛选和业务表单。"
        title="基础配置"
      />

      <nav
        aria-label="基础配置二级目录"
        className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3 lg:hidden"
      >
        {settingsCategories.map((category) => (
          <Link
            aria-current={activeCategory === category ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              activeCategory === category
                ? "bg-brand text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 hover:text-ink",
            )}
            href={`/admin/settings?category=${category}`}
            key={category}
          >
            {categoryLabels[category]}
          </Link>
        ))}
      </nav>

      {message ? (
        <p
          aria-live="polite"
          className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-panel"
        >
          {message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink">
                {categoryLabels[activeCategory]}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {activeOptions.length} 项
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">
              {categoryDescriptions[activeCategory]}
            </p>
          </div>

          <div className="flex w-full max-w-lg flex-col gap-2 sm:flex-row 2xl:w-auto">
              <label className="sr-only" htmlFor={`new-${activeCategory}`}>
                新增{categoryLabels[activeCategory]}
              </label>
              <input
                autoComplete="off"
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm text-ink outline-none transition-colors duration-150 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-blue-100 sm:w-64"
                id={`new-${activeCategory}`}
                maxLength={100}
                name={`new-${activeCategory}`}
                onChange={(event) =>
                  setNewLabels((current) => ({
                    ...current,
                    [activeCategory]: event.target.value,
                  }))
                }
                placeholder={`新增${categoryLabels[activeCategory]}…`}
                value={newLabels[activeCategory] ?? ""}
              />
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={busy}
                onClick={() => createOption(activeCategory)}
                type="button"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                新增
              </button>
          </div>
        </div>

        <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 sm:px-5">
          拖动每行左侧手柄调整顺序；键盘或手机端可使用上移、下移按钮。
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="w-32 px-4 py-3" scope="col">展示顺序</th>
                <th className="px-4 py-3" scope="col">显示名称</th>
                <th className="px-4 py-3" scope="col">状态</th>
                <th className="px-4 py-3" scope="col">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeOptions.map((option, index) => {
                const draft = drafts[option.id] ?? {};
                const enabled = draft.enabled ?? option.enabled;

                return (
                  <tr
                    className={cn(
                      "transition-colors duration-150",
                      draggingId === option.id
                        ? "select-none bg-blue-50 opacity-70"
                        : "bg-white",
                    )}
                    key={option.id}
                    onDragOver={(event) => {
                      event.preventDefault();
                      handleDragOver(option);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleDrop();
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          aria-label={`拖动调整${option.label}的展示顺序`}
                          className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-md text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                          disabled={busy}
                          draggable={!busy}
                          onDragEnd={handleDragEnd}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", option.id);
                            handleDragStart(option);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "ArrowUp") {
                              event.preventDefault();
                              moveOption(option.id, -1);
                            }
                            if (event.key === "ArrowDown") {
                              event.preventDefault();
                              moveOption(option.id, 1);
                            }
                          }}
                          title="拖动调整展示顺序"
                          type="button"
                        >
                          <GripVertical aria-hidden="true" className="h-5 w-5" />
                        </button>
                        <button
                          aria-label={`上移${option.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={busy || index === 0}
                          onClick={() => moveOption(option.id, -1)}
                          title="上移"
                          type="button"
                        >
                          <ChevronUp aria-hidden="true" className="h-4 w-4" />
                        </button>
                        <button
                          aria-label={`下移${option.label}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-30"
                          disabled={busy || index === activeOptions.length - 1}
                          onClick={() => moveOption(option.id, 1)}
                          title="下移"
                          type="button"
                        >
                          <ChevronDown aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only" htmlFor={`label-${option.id}`}>
                        {option.label}显示名称
                      </label>
                      <input
                        autoComplete="off"
                        className="h-9 w-full min-w-40 rounded-md border border-slate-200 px-3 text-sm text-ink outline-none transition-colors duration-150 focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-blue-100"
                        id={`label-${option.id}`}
                        maxLength={100}
                        name={`label-${option.id}`}
                        onChange={(event) =>
                          updateDraft(option.id, { label: event.target.value })
                        }
                        value={draft.label ?? option.label}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          checked={enabled}
                          className="h-4 w-4 rounded border-slate-300 text-brand focus-visible:ring-2 focus-visible:ring-brand"
                          name={`enabled-${option.id}`}
                          onChange={(event) =>
                            updateDraft(option.id, { enabled: event.target.checked })
                          }
                          type="checkbox"
                        />
                        {enabled ? "启用" : "停用"}
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:text-slate-400"
                          disabled={busy}
                          onClick={() => saveOption(option)}
                          type="button"
                        >
                          <Save aria-hidden="true" className="h-4 w-4" />
                          保存
                        </button>
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:text-slate-400"
                          disabled={busy}
                          onClick={() => deleteOption(option)}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activeOptions.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-muted" colSpan={4}>
                    暂无配置项，请在上方新增。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
