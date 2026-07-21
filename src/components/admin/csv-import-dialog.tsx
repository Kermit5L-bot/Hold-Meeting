"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Upload, X } from "lucide-react";
import type { PublicAdminUser } from "@/lib/admin-users";

interface ImportIssue {
  rowNumber: number;
  importKey?: string;
  message: string;
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  importedRows?: number;
  errorRows: ImportIssue[];
  duplicateRows: ImportIssue[];
}

export function CsvImportDialog({
  title,
  description,
  templateHref,
  previewUrl,
  confirmUrl,
  triggerLabel = "导入数据",
  accountId,
  ownerOptions = [],
}: {
  title: string;
  description: string;
  templateHref: string;
  previewUrl: string;
  confirmUrl: string;
  triggerLabel?: string;
  accountId?: string;
  ownerOptions?: PublicAdminUser[];
}) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState("");

  async function readFile(file: File) {
    setError("");
    setPreview(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvText("");
      setError("请上传 CSV 文件。");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setCsvText("");
      setError("单个 CSV 文件不能超过 2MB。");
      return;
    }

    const text = await file.text();

    if (text.includes("\uFFFD")) {
      setCsvText("");
      setError("文件编码无法识别，请在 Excel 或 WPS 中另存为 CSV UTF-8 后重试。");
      return;
    }

    setCsvText(text);
  }

  async function postCsv(url: string) {
    if (accountId === "all" && !ownerUserId) throw new Error("请选择数据归属账号。");
    const separator = url.includes("?") ? "&" : "?";
    const scopedUrl = accountId ? `${url}${separator}accountId=${encodeURIComponent(accountId)}` : url;
    const response = await fetch(scopedUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ csv: csvText, ownerUserId: ownerUserId || undefined }),
    });
    const data = (await response.json().catch(() => null)) as
      | (ImportPreview & { message?: string })
      | null;

    if (!response.ok || !data) {
      throw new Error(data?.message ?? "导入请求失败。");
    }

    return data;
  }

  async function previewImport() {
    if (!csvText.trim()) {
      setError("请先选择 CSV 文件。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      setPreview(await postCsv(previewUrl));
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "预览失败。");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmImport() {
    if (!preview || preview.validRows <= 0) {
      setError("没有可导入的数据。");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const result = await postCsv(confirmUrl);
      setPreview(result);
      window.location.reload();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "确认导入失败。");
      setSubmitting(false);
    }
  }

  function closeDialog() {
    setOpen(false);
    setCsvText("");
    setFileName("");
    setPreview(null);
    setError("");
    setSubmitting(false);
  }

  return (
    <>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Upload aria-hidden="true" className="h-4 w-4" />
        {triggerLabel}
      </button>

      {open ? (
        <div
          aria-labelledby="csv-import-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4"
          role="dialog"
        >
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-5 py-4 shadow-[0_8px_18px_rgba(15,23,42,0.04)] backdrop-blur">
              <div>
                <h2 className="text-lg font-semibold text-ink" id="csv-import-title">
                  {title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
              </div>
              <button
                aria-label="关闭导入弹窗"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-ink"
                onClick={closeDialog}
                type="button"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5">
              {accountId === "all" ? <label className="grid gap-1 text-sm font-medium text-ink">数据归属账号<select autoComplete="off" className="h-10 rounded-md border border-slate-300 bg-white px-3" name="importOwnerUserId" onChange={(event) => setOwnerUserId(event.target.value)} required value={ownerUserId}><option value="">请选择</option>{ownerOptions.filter((item) => item.status !== "deleted").map((item) => <option key={item.id} value={item.id}>{item.displayName}（{item.username}）</option>)}</select></label> : null}
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                  href={templateHref}
                >
                  <Download aria-hidden="true" className="h-4 w-4" />
                  下载导入模板
                </Link>
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700">
                  <Upload aria-hidden="true" className="h-4 w-4" />
                  选择 CSV
                  <input
                    accept=".csv,text/csv"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void readFile(file);
                      }
                    }}
                    type="file"
                  />
                </label>
              </div>

              {fileName ? (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  已选择：{fileName}
                </p>
              ) : null}

              {error ? (
                <p
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {preview ? (
                <div className="grid gap-3 rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <Metric label="总行数" value={preview.totalRows} />
                    <Metric label="可导入" value={preview.validRows} />
                    <Metric label="错误行" value={preview.errorRows.length} />
                    <Metric label="重复行" value={preview.duplicateRows.length} />
                  </div>
                  <IssueList title="错误行" issues={preview.errorRows} />
                  <IssueList title="重复行" issues={preview.duplicateRows} />
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50"
                onClick={closeDialog}
                type="button"
              >
                取消
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                disabled={submitting || !csvText}
                onClick={previewImport}
                type="button"
              >
                预览校验
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={submitting || !preview || preview.validRows <= 0}
                onClick={confirmImport}
                type="button"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function IssueList({ title, issues }: { title: string; issues: ImportIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200">
      <p className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-ink">
        {title}
      </p>
      <ul className="max-h-40 overflow-y-auto px-3 py-2 text-sm leading-6 text-slate-600">
        {issues.slice(0, 20).map((issue) => (
          <li key={`${issue.rowNumber}-${issue.importKey ?? issue.message}`}>
            第 {issue.rowNumber} 行：{issue.message}
          </li>
        ))}
        {issues.length > 20 ? <li>还有 {issues.length - 20} 行未展示。</li> : null}
      </ul>
    </div>
  );
}
