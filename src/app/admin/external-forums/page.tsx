import { ExternalForumManager } from "@/components/admin/external-forum-manager";
import { readExternalForums } from "@/lib/external-forums-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { hasAdminModule, recordInScope, resolveVerifiedAccountScope } from "@/lib/admin-access";
import { readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export default async function ExternalForumsPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const user = await getCurrentAdminUser(); if (!user) redirect("/login");
  if (!hasAdminModule(user, "external_forums")) redirect("/admin/forbidden");
  const { accountId } = await searchParams; const scope = await resolveVerifiedAccountScope(user, accountId); if (!scope) redirect("/admin/forbidden");
  const records = (await readExternalForums()).filter((item) => recordInScope(item.ownerUserId, scope));
  const accountOptions = user.role === "super_admin" ? (await readAdminUsers()).map(toPublicAdminUser) : [];
  const [
    departmentOptions,
    costTypeOptions,
    attendancePurposeOptions,
    meetingOutputOptions,
  ] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("costType"),
    readActiveSettingsOptions("attendancePurpose"),
    readActiveSettingsOptions("meetingOutput"),
  ]);

  return (
    <ExternalForumManager
      key={scope.requested}
      attendancePurposeOptions={attendancePurposeOptions}
      costTypeOptions={costTypeOptions}
      departmentOptions={departmentOptions}
      initialRecords={records}
      meetingOutputOptions={meetingOutputOptions}
      accountId={scope.requested}
      accountOptions={accountOptions}
      showAccountColumn={user.role === "super_admin"}
    />
  );
}
