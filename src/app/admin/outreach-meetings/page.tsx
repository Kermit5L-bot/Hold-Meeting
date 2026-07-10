import { OutreachMeetingManager } from "@/components/admin/outreach-meeting-manager";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";

export const dynamic = "force-dynamic";

export default async function OutreachMeetingsPage() {
  const meetings = await readOutreachMeetings();
  const [departmentOptions, regionOptions] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("region"),
  ]);

  return (
    <OutreachMeetingManager
      departmentOptions={departmentOptions}
      initialMeetings={meetings}
      regionOptions={regionOptions}
    />
  );
}
