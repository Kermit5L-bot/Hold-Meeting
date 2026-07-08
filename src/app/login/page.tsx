import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#eaf4ff_42%,#f6fbff_100%)] px-4 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.08)_1px,transparent_1px)] bg-[size:56px_56px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-blue-400/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-300/25"
      />
      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-lg border border-white/70 bg-white/50 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.82)] ring-1 ring-cyan-300/30 backdrop-blur-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.72),rgba(219,234,254,0.28)_48%,rgba(255,255,255,0.42))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
        />
        <div className="relative z-10">
          <p className="text-sm font-medium text-brand">后台登录</p>
          <h1 className="mt-2 text-2xl font-semibold leading-9 text-ink">
            万维盈创会议信息收集管理系统
          </h1>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
