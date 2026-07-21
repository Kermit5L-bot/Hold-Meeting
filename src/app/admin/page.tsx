import { AdminHomeVisual } from "@/components/admin/admin-home-visual";
import { readExternalForums } from "@/lib/external-forums-store";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { readRegistrations } from "@/lib/registrations-store";
import { readSettingsLabelMap } from "@/lib/settings-options";
import { redirect } from "next/navigation";
import { getCurrentAdminUser } from "@/lib/server-auth";
import { hasAdminModule, recordInScope, resolveVerifiedAccountScope } from "@/lib/admin-access";
import type { AdminModule } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminHomePage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const user = await getCurrentAdminUser(); if (!user) redirect("/login");
  const { accountId } = await searchParams; const scope = await resolveVerifiedAccountScope(user, accountId); if (!scope) redirect("/admin/forbidden");
  const [
    registrations,
    externalForums,
    marketingMeetings,
    outreachMeetings,
    organizationTypeLabels,
    meetingOutputLabels,
    marketingMeetingTypeLabels,
  ] =
    await Promise.all([
      readRegistrations(),
      readExternalForums(),
      readMarketingMeetings(),
      readOutreachMeetings(),
      readSettingsLabelMap("organizationType"),
      readSettingsLabelMap("meetingOutput"),
      readSettingsLabelMap("marketingMeetingType"),
    ]);

  const scopedOutreach = outreachMeetings.filter((item) => recordInScope(item.ownerUserId, scope));
  const meetingIds = new Set(scopedOutreach.map((item) => item.id));
  const visibleModules: AdminModule[] = ["outreach_meetings", "external_forums", "marketing_meetings"].filter((item): item is AdminModule => hasAdminModule(user, item as AdminModule));
  return (
    <AdminHomeVisual
      externalForums={externalForums.filter((item) => recordInScope(item.ownerUserId, scope))}
      marketingMeetings={marketingMeetings.filter((item) => recordInScope(item.ownerUserId, scope))}
      outreachMeetings={scopedOutreach}
      optionLabels={{
        organizationType: organizationTypeLabels,
        meetingOutput: meetingOutputLabels,
        marketingMeetingType: marketingMeetingTypeLabels,
      }}
      registrations={registrations.filter((item) => meetingIds.has(item.meetingId))}
      accountId={scope.requested}
      visibleModules={visibleModules}
    />
  );
}
