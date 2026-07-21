"use client";

import { useMemo, useState, type ReactNode } from "react";
import { KeyRound, Pencil, Plus, Power, Trash2, UserRoundCog, X } from "lucide-react";
import type { PublicAdminUser } from "@/lib/admin-users";
import type { AdminModule } from "@/lib/types";

const modules: { value: AdminModule; label: string }[] = [
  { value: "outreach_meetings", label: "外联会议" },
  { value: "external_forums", label: "外部会议&论坛" },
  { value: "marketing_meetings", label: "营销中心会议" },
];
const statusLabel = { active: "启用", disabled: "停用", deleted: "已删除" } as const;

export function PermissionManager({ initialUsers, currentUserId }: { initialUsers: PublicAdminUser[]; currentUserId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editing, setEditing] = useState<PublicAdminUser | "new" | null>(null);
  const [error, setError] = useState("");
  const visible = useMemo(() => users.filter((user) => showDeleted || user.status !== "deleted"), [showDeleted, users]);

  async function refresh() {
    const response = await fetch("/api/admin/users");
    const data = await response.json() as { users: PublicAdminUser[] };
    setUsers(data.users);
    window.dispatchEvent(new Event("admin-users-changed"));
  }
  async function action(url: string, init: RequestInit) {
    setError("");
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) { setError(data?.message ?? "操作失败"); return false; }
    await refresh();
    return true;
  }
  async function toggle(user: PublicAdminUser) {
    await action(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: user.status === "active" ? "disabled" : "active" }) });
  }
  async function remove(user: PublicAdminUser) {
    if (!window.confirm(`确认删除账号“${user.displayName}”？账号不可恢复，但历史数据会保留。`)) return;
    await action(`/api/admin/users/${user.id}`, { method: "DELETE" });
  }
  async function reset(user: PublicAdminUser) {
    const password = window.prompt(`为“${user.displayName}”设置新密码（至少 12 位）`);
    if (!password) return;
    if (await action(`/api/admin/users/${user.id}/reset-password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) })) window.alert("密码已重置，旧登录状态已失效。");
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-blue-600">系统管理</p><h1 className="mt-2 text-2xl font-semibold">权限管理</h1><p className="mt-2 text-sm text-slate-500">创建子账号并按业务模块授权。各账号业务数据相互隔离。</p></div>
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-medium text-white" onClick={() => setEditing("new")} type="button"><Plus aria-hidden="true" className="h-4 w-4" />新建账号</button>
      </header>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div className="flex items-center gap-2"><UserRoundCog aria-hidden="true" className="h-5 w-5 text-blue-600" /><h2 className="font-semibold">后台账号</h2></div><label className="flex items-center gap-2 text-sm text-slate-600"><input checked={showDeleted} name="showDeletedUsers" onChange={(event) => setShowDeleted(event.target.checked)} type="checkbox" />显示已删除账号</label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3">账号</th><th className="px-5 py-3">显示名称</th><th className="px-5 py-3">状态</th><th className="px-5 py-3">授权模块</th><th className="px-5 py-3">创建时间</th><th className="px-5 py-3">最后登录</th><th className="px-5 py-3">操作</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{visible.map((user) => <tr key={user.id}><td className="px-5 py-4 font-medium">{user.username}{user.id === currentUserId ? <span className="ml-2 text-xs text-blue-600">当前账号</span> : null}</td><td className="px-5 py-4">{user.displayName}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs ${user.status === "active" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}`}>{statusLabel[user.status]}</span></td><td className="px-5 py-4 text-slate-600">{user.role === "super_admin" ? "全部模块" : user.permissions.map((value) => modules.find((item) => item.value === value)?.label).filter(Boolean).join("、")}</td><td className="px-5 py-4 text-slate-500">{new Date(user.createdAt).toLocaleString("zh-CN")}</td><td className="px-5 py-4 text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("zh-CN") : "-"}</td><td className="px-5 py-4">{user.role === "admin" && user.status !== "deleted" ? <div className="flex gap-1"><IconButton label="编辑" onClick={() => setEditing(user)}><Pencil /></IconButton><IconButton label={user.status === "active" ? "停用" : "启用"} onClick={() => toggle(user)}><Power /></IconButton><IconButton label="重置密码" onClick={() => reset(user)}><KeyRound /></IconButton><IconButton danger label="删除" onClick={() => remove(user)}><Trash2 /></IconButton></div> : <span className="text-slate-400">-</span>}</td></tr>)}</tbody>
        </table></div>
      </section>
      {editing ? <AccountDialog user={editing} onClose={() => setEditing(null)} onSaved={async () => { await refresh(); setEditing(null); }} /> : null}
    </div>
  );
}

function IconButton({ label, onClick, children, danger = false }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean }) {
  return <button aria-label={label} className={`inline-flex h-9 w-9 items-center justify-center rounded-md border [&_svg]:h-4 [&_svg]:w-4 ${danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} onClick={onClick} title={label} type="button">{children}</button>;
}

function AccountDialog({ user, onClose, onSaved }: { user: PublicAdminUser | "new"; onClose: () => void; onSaved: () => void }) {
  const existing = user === "new" ? null : user;
  const [permissions, setPermissions] = useState<AdminModule[]>(existing?.permissions ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(existing ? `/api/admin/users/${existing.id}` : "/api/admin/users", { method: existing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: form.get("username"), displayName: form.get("displayName"), password: form.get("password"), permissions }) });
    const data = await response.json().catch(() => null) as { message?: string } | null;
    if (!response.ok) { setError(data?.message ?? "保存失败"); setBusy(false); return; }
    onSaved();
  }
  return <div aria-modal="true" className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4" role="dialog"><form className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl" onSubmit={submit}><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><h2 className="text-lg font-semibold">{existing ? "编辑账号" : "新建账号"}</h2><button aria-label="关闭" onClick={onClose} type="button"><X className="h-5 w-5" /></button></div><div className="grid gap-4 p-5">{!existing ? <label className="grid gap-1 text-sm">账号<input autoComplete="username" className="h-10 rounded-md border border-slate-300 px-3" name="username" required /></label> : null}<label className="grid gap-1 text-sm">显示名称<input className="h-10 rounded-md border border-slate-300 px-3" defaultValue={existing?.displayName} name="displayName" required /></label>{!existing ? <label className="grid gap-1 text-sm">初始密码<input autoComplete="new-password" className="h-10 rounded-md border border-slate-300 px-3" minLength={12} name="password" required type="password" /><span className="text-xs text-slate-500">至少 12 个字符</span></label> : null}<fieldset className="grid gap-2"><legend className="text-sm font-medium">业务模块授权</legend>{modules.map((item) => <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm" key={item.value}><input checked={permissions.includes(item.value)} onChange={(event) => setPermissions((current) => event.target.checked ? [...current, item.value] : current.filter((value) => value !== item.value))} type="checkbox" />{item.label}</label>)}</fieldset>{error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}<div className="flex justify-end gap-2"><button className="h-10 rounded-md border border-slate-300 px-4" onClick={onClose} type="button">取消</button><button className="h-10 rounded-md bg-blue-600 px-4 text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? "保存中..." : "保存"}</button></div></div></form></div>;
}
