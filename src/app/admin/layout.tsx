import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");
  const accountOptions = user.role === "super_admin"
    ? (await readAdminUsers()).map(toPublicAdminUser)
    : [];
  return <AppShell accountOptions={accountOptions} currentUser={toPublicAdminUser(user)}>{children}</AppShell>;
}
