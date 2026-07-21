"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";
import type { PublicAdminUser } from "@/lib/admin-users";

export function TopBar({ dark = false, currentUser, accountOptions }: { dark?: boolean; currentUser: PublicAdminUser; accountOptions: PublicAdminUser[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState(accountOptions);
  const accountId = searchParams.get("accountId") || currentUser.id;

  useEffect(() => {
    setAvailableAccounts(accountOptions);
  }, [accountOptions]);

  useEffect(() => {
    if (currentUser.role !== "super_admin") return;

    async function refreshAccounts() {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { users?: PublicAdminUser[] };
      if (Array.isArray(data.users)) setAvailableAccounts(data.users);
    }

    window.addEventListener("admin-users-changed", refreshAccounts);
    window.addEventListener("focus", refreshAccounts);
    void refreshAccounts();
    return () => {
      window.removeEventListener("admin-users-changed", refreshAccounts);
      window.removeEventListener("focus", refreshAccounts);
    };
  }, [currentUser.role]);

  function changeScope(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === currentUser.id) params.delete("accountId"); else params.set("accountId", value);
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <header className={cn("flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6", dark ? "border-cyan-300/15 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-ink")}>
        {currentUser.role === "super_admin" ? (
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className={dark ? "text-cyan-100/70" : "text-slate-500"}>数据账号</span>
            <select aria-label="选择数据账号" autoComplete="off" className={cn("h-9 max-w-56 rounded-md border px-3 text-sm", dark ? "border-cyan-300/20 bg-slate-900 text-white" : "border-slate-200 bg-white")} name="accountScope" onChange={(event) => changeScope(event.target.value)} value={accountId}>
              <option value={currentUser.id}>我的数据</option>
              <option value="all">全部账号</option>
              {availableAccounts.filter((item) => item.id !== currentUser.id).map((item) => <option key={item.id} value={item.id}>{item.displayName}（{item.status === "active" ? "启用" : item.status === "disabled" ? "停用" : "已删除"}）</option>)}
            </select>
          </label>
        ) : <span />}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden text-right sm:block">
            <p className={cn("text-sm font-medium", dark ? "text-white" : "text-ink")}>{currentUser.displayName}</p>
            <p className={cn("text-xs", dark ? "text-cyan-100/70" : "text-muted")}>{currentUser.role}</p>
          </div>
          <button aria-label="修改密码" className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md border", dark ? "border-cyan-300/20 hover:bg-cyan-300/10" : "border-slate-200 hover:bg-slate-50")} onClick={() => setPasswordOpen(true)} title="修改密码" type="button"><KeyRound aria-hidden="true" className="h-4 w-4" /></button>
          <LogoutButton dark={dark} />
        </div>
      </header>
      {passwordOpen ? <ChangePasswordDialog onClose={() => setPasswordOpen(false)} /> : null}
    </>
  );
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }) });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) { setMessage(data?.message ?? "修改失败"); setBusy(false); return; }
    window.location.href = "/login";
  }
  return <div aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4" role="dialog"><form className="w-full max-w-md rounded-lg bg-white shadow-xl" onSubmit={submit}><div className="sticky top-0 border-b border-slate-200 bg-white px-5 py-4"><h2 className="text-lg font-semibold">修改密码</h2></div><div className="grid gap-4 p-5"><label className="grid gap-1 text-sm">当前密码<input autoComplete="current-password" className="h-10 rounded-md border border-slate-300 px-3" name="currentPassword" required type="password" /></label><label className="grid gap-1 text-sm">新密码<input autoComplete="new-password" className="h-10 rounded-md border border-slate-300 px-3" minLength={12} name="newPassword" required type="password" /><span className="text-xs text-slate-500">至少 12 个字符</span></label>{message ? <p className="text-sm text-red-600" role="alert">{message}</p> : null}<div className="flex justify-end gap-2"><button className="h-10 rounded-md border border-slate-300 px-4" onClick={onClose} type="button">取消</button><button className="h-10 rounded-md bg-blue-600 px-4 text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? "保存中..." : "保存并重新登录"}</button></div></div></form></div>;
}
