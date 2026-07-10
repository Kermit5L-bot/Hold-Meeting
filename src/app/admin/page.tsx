import { AdminHomeVisual } from "@/components/admin/admin-home-visual";
import { readExternalForums } from "@/lib/external-forums-store";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { readRegistrations } from "@/lib/registrations-store";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const [registrations, externalForums, marketingMeetings, outreachMeetings] =
    await Promise.all([
      readRegistrations(),
      readExternalForums(),
      readMarketingMeetings(),
      readOutreachMeetings(),
    ]);

  return (
    <AdminHomeVisual
      externalForums={externalForums}
      marketingMeetings={marketingMeetings}
      outreachMeetings={outreachMeetings}
      registrations={registrations}
    />
  );
}
