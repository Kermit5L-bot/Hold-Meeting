import { OutreachMeetingManager } from "@/components/admin/outreach-meeting-manager";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { hasAdminModule, recordInScope, resolveVerifiedAccountScope } from "@/lib/admin-access";
import { readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export default async function OutreachMeetingsPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const user = await getCurrentAdminUser(); if (!user) redirect("/login");
  if (!hasAdminModule(user, "outreach_meetings")) redirect("/admin/forbidden");
  const { accountId } = await searchParams; const scope = await resolveVerifiedAccountScope(user, accountId); if (!scope) redirect("/admin/forbidden");
  const meetings = (await readOutreachMeetings()).filter((item) => recordInScope(item.ownerUserId, scope));
  const accountOptions = user.role === "super_admin" ? (await readAdminUsers()).map(toPublicAdminUser) : [];
  const [departmentOptions, regionOptions] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("region"),
  ]);

  return (
    <OutreachMeetingManager
      key={scope.requested}
      departmentOptions={departmentOptions}
      initialMeetings={meetings}
      regionOptions={regionOptions}
      accountId={scope.requested}
      accountOptions={accountOptions}
      showAccountColumn={user.role === "super_admin"}
    />
  );
}
