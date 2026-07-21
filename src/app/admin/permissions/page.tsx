import { redirect } from "next/navigation";
import { PermissionManager } from "@/components/admin/permission-manager";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";

export const dynamic = "force-dynamic";
export default async function PermissionsPage() {
  const user = await getCurrentAdminUser();
  if (!user) redirect("/login");
  if (user.role !== "super_admin") redirect("/admin/forbidden");
  return <PermissionManager currentUserId={user.id} initialUsers={(await readAdminUsers()).map(toPublicAdminUser)} />;
}
