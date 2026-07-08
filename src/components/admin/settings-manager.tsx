"use client";

import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { categoryLabels } from "@/lib/settings-constants";
import type { SettingsCategory, SettingsOption } from "@/lib/types";

const categories: SettingsCategory[] = [
  "department",
  "region",
  "organizationType",
  "costType",
  "marketingMeetingType",
  "attendancePurpose",
  "meetingOutput",
];

const customCategories = new Set<SettingsCategory>(["department", "region"]);

export function SettingsManager({
  initialOptions,
}: {
  initialOptions: SettingsOption[];
}) {
  const [options, setOptions] = useState(initialOptions);
  const [drafts, setDrafts] = useState<Record<string, Partial<SettingsOption>>>({});
  const [newLabels, setNewLabels] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  const grouped = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category,
          options
            .filter((option) => option.category === category)
            .sort((a, b) => a.sortOrder - b.sortOrder),
        ]),
      ) as Record<SettingsCategory, SettingsOption[]>,
    [options],
  );

  function updateDraft(id: string, values: Partial<SettingsOption>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...values,
      },
    }));
  }

  async function saveOption(option: SettingsOption) {
    setMessage("");
    const draft = drafts[option.id] ?? {};
    const response = await fetch(`/api/settings/${option.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: draft.label ?? option.label,
        enabled: draft.enabled ?? option.enabled,
        sortOrder:
          typeof draft.sortOrder === "number" ? draft.sortOrder : option.sortOrder,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | { option?: SettingsOption; message?: string }
      | null;

    if (!response.ok || !data?.option) {
      setMessage(data?.message ?? "保存失败。");
      return;
    }

    setOptions((current) =>
      current.map((item) => (item.id === option.id ? data.option! : item)),
    );
    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[option.id];
      return nextDrafts;
    });
    setMessage("配置已保存。");
  }

  async function createOption(category: SettingsCategory) {
    setMessage("");
    const label = newLabels[category]?.trim() ?? "";

    if (!label) {
      setMessage("请填写新增配置名称。");
      return;
    }

    const response = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ category, label }),
    });
    const data = (await response.json().catch(() => null)) as
      | { option?: SettingsOption; message?: string }
      | null;

    if (!response.ok || !data?.option) {
      setMessage(data?.message ?? "新增失败。");
      return;
    }

    setOptions((current) => [...current, data.option!]);
    setNewLabels((current) => ({ ...current, [category]: "" }));
    setMessage("配置已新增。");
  }

  async function deleteOption(option: SettingsOption) {
    setMessage("");
    const response = await fetch(`/api/settings/${option.id}`, {
      method: "DELETE",
    });
    const data = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;

    if (!response.ok) {
      setMessage(data?.message ?? "删除失败。");
      return;
    }

    setOptions((current) => current.filter((item) => item.id !== option.id));
    setMessage("配置已删除。");
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        description="维护部门、区域和常用业务字典。系统状态类字段不开放配置，避免影响报名、签到和统计逻辑。"
        title="基础配置"
      />

      {message ? (
        <p className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-panel">
          {message}
        </p>
      ) : null}

      <section className="grid gap-4">
        {categories.map((category) => {
          const canCreate = customCategories.has(category);

          return (
            <article
              className="rounded-lg border border-slate-200 bg-white shadow-panel"
              key={category}
            >
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">
                    {categoryLabels[category]}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {canCreate
                      ? "支持新增、编辑、删除、启用/停用和排序。"
                      : "系统枚举值可编辑显示名、启用/停用和排序，不建议新增自定义值。"}
                  </p>
                </div>
                {canCreate ? (
                  <div className="flex flex-col gap-2 sm:w-80 sm:flex-row">
                    <input
                      className="h-10 rounded-md border border-slate-200 px-3 text-sm text-ink"
                      onChange={(event) =>
                        setNewLabels((current) => ({
                          ...current,
                          [category]: event.target.value,
                        }))
                      }
                      placeholder={`新增${categoryLabels[category]}`}
                      value={newLabels[category] ?? ""}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
                      onClick={() => createOption(category)}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      新增
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-4 py-3">显示名称</th>
                      <th className="px-4 py-3">系统值</th>
                      <th className="px-4 py-3">排序</th>
                      <th className="px-4 py-3">状态</th>
                      <th className="px-4 py-3">类型</th>
                      <th className="px-4 py-3">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grouped[category].map((option) => {
                      const draft = drafts[option.id] ?? {};
                      const enabled = draft.enabled ?? option.enabled;

                      return (
                        <tr key={option.id}>
                          <td className="px-4 py-3">
                            <input
                              className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm text-ink"
                              onChange={(event) =>
                                updateDraft(option.id, { label: event.target.value })
                              }
                              value={draft.label ?? option.label}
                            />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{option.value}</td>
                          <td className="px-4 py-3">
                            <input
                              className="h-9 w-24 rounded-md border border-slate-200 px-3 text-sm text-ink"
                              onChange={(event) =>
                                updateDraft(option.id, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                              type="number"
                              value={draft.sortOrder ?? option.sortOrder}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                              <input
                                checked={enabled}
                                className="h-4 w-4 rounded border-slate-300 text-brand"
                                onChange={(event) =>
                                  updateDraft(option.id, {
                                    enabled: event.target.checked,
                                  })
                                }
                                type="checkbox"
                              />
                              {enabled ? "启用" : "停用"}
                            </label>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {option.system ? "系统内置" : "自定义"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                                onClick={() => saveOption(option)}
                                type="button"
                              >
                                <Save aria-hidden="true" className="h-4 w-4" />
                                保存
                              </button>
                              {!option.system ? (
                                <button
                                  className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 transition-colors duration-150 hover:bg-red-50"
                                  onClick={() => deleteOption(option)}
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                                  删除
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
