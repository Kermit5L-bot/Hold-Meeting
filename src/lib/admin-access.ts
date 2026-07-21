import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/server-auth";
import type { AdminUser } from "@/lib/admin-users";
import type { AdminModule } from "@/lib/types";
import { readAdminUsers } from "@/lib/admin-users";

export interface AccountScope {
  requested: string;
  ownerUserIds: string[] | null;
  targetOwnerUserId?: string;
}

export function hasAdminModule(user: AdminUser, module: AdminModule) {
  return user.role === "super_admin" || user.permissions.includes(module);
}

export function resolveAccountScope(user: AdminUser, accountId?: string | null): AccountScope | null {
  const requested = accountId?.trim() || user.id;
  if (user.role !== "super_admin") {
    return requested === user.id ? { requested: user.id, ownerUserIds: [user.id], targetOwnerUserId: user.id } : null;
  }
  if (requested === "all") return { requested, ownerUserIds: null };
  return { requested, ownerUserIds: [requested], targetOwnerUserId: requested };
}

export function recordInScope(ownerUserId: string, scope: AccountScope) {
  return scope.ownerUserIds === null || scope.ownerUserIds.includes(ownerUserId);
}

export async function authorizeAdminRequest(module?: AdminModule, superOnly = false) {
  const user = await getCurrentAdminUser();
  if (!user) return { response: NextResponse.json({ message: "请先登录后台" }, { status: 401 }) } as const;
  if ((superOnly && user.role !== "super_admin") || (module && !hasAdminModule(user, module))) {
    return { response: NextResponse.json({ message: "无权访问该功能" }, { status: 403 }) } as const;
  }
  return { user } as const;
}

export function resolveRequestScope(user: AdminUser, request: Request) {
  const accountId = new URL(request.url).searchParams.get("accountId");
  return resolveAccountScope(user, accountId);
}

export async function resolveVerifiedRequestScope(user: AdminUser, request: Request) {
  return resolveVerifiedAccountScope(user, new URL(request.url).searchParams.get("accountId"));
}

export async function resolveVerifiedAccountScope(user: AdminUser, accountId?: string | null) {
  const scope = resolveAccountScope(user, accountId);
  if (!scope) return null;
  if (scope.requested === "all" || scope.requested === user.id) return scope;
  const exists = (await readAdminUsers()).some((item) => item.id === scope.requested);
  return exists ? scope : null;
}

export async function resolveWriteOwner(user: AdminUser, request: Request, body?: Record<string, unknown> | null) {
  const scope = await resolveVerifiedRequestScope(user, request);
  if (!scope) return null;
  const ownerUserId = scope.targetOwnerUserId ?? (typeof body?.ownerUserId === "string" ? body.ownerUserId : "");
  if (!ownerUserId) return null;
  return (await readAdminUsers()).some((item) => item.id === ownerUserId && item.status !== "deleted") ? ownerUserId : null;
}
