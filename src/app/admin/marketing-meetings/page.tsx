import { MarketingMeetingManager } from "@/components/admin/marketing-meeting-manager";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { hasAdminModule, recordInScope, resolveVerifiedAccountScope } from "@/lib/admin-access";
import { readAdminUsers, toPublicAdminUser } from "@/lib/admin-users";

export const dynamic = "force-dynamic";

export default async function MarketingMeetingsPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const user = await getCurrentAdminUser(); if (!user) redirect("/login");
  if (!hasAdminModule(user, "marketing_meetings")) redirect("/admin/forbidden");
  const { accountId } = await searchParams; const scope = await resolveVerifiedAccountScope(user, accountId); if (!scope) redirect("/admin/forbidden");
  const records = (await readMarketingMeetings()).filter((item) => recordInScope(item.ownerUserId, scope));
  const accountOptions = user.role === "super_admin" ? (await readAdminUsers()).map(toPublicAdminUser) : [];
  const [departmentOptions, meetingTypeOptions] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("marketingMeetingType"),
  ]);

  return (
    <MarketingMeetingManager
      key={scope.requested}
      departmentOptions={departmentOptions}
      initialRecords={records}
      meetingTypeOptions={meetingTypeOptions}
      accountId={scope.requested}
      accountOptions={accountOptions}
      showAccountColumn={user.role === "super_admin"}
    />
  );
}
