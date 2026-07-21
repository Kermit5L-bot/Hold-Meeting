"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("页面渲染失败", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-panel">
        <p className="text-sm font-medium text-red-700">页面加载失败</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">
          系统暂时无法完成本次操作
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          请稍后重试；如果持续出现，请联系运维查看应用日志和数据目录状态。
        </p>
        <button
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700"
          onClick={reset}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          重新加载
        </button>
      </section>
    </main>
  );
}
