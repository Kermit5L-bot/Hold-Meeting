"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("请填写账号和密码");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          remember,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        setError(data?.message ?? "账号或密码错误");
        return;
      }

      const next = searchParams.get("next");
      router.replace(next?.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch {
      setError("网络连接失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={submitLogin}>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        账号
        <input
          autoComplete="username"
          className="h-11 rounded-md border border-white/70 bg-white/45 px-3 text-base text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition-colors duration-150 placeholder:text-slate-500/70 focus:border-brand focus:bg-white/70 focus:ring-2 focus:ring-brand/15"
          name="username"
          onChange={(event) => setUsername(event.target.value)}
          placeholder="请输入后台账号"
          required
          type="text"
          value={username}
        />
      </label>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        密码
        <input
          autoComplete="current-password"
          className="h-11 rounded-md border border-white/70 bg-white/45 px-3 text-base text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-none transition-colors duration-150 placeholder:text-slate-500/70 focus:border-brand focus:bg-white/70 focus:ring-2 focus:ring-brand/15"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="请输入密码"
          required
          type="password"
          value={password}
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          checked={remember}
          className="h-4 w-4 rounded border-slate-300 text-brand"
          name="remember"
          onChange={(event) => setRemember(event.target.checked)}
          type="checkbox"
        />
        记住登录状态
      </label>
      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
