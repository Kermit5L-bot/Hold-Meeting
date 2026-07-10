import { MarketingMeetingManager } from "@/components/admin/marketing-meeting-manager";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readActiveSettingsOptions } from "@/lib/settings-options";

export const dynamic = "force-dynamic";

export default async function MarketingMeetingsPage() {
  const records = await readMarketingMeetings();
  const [departmentOptions, meetingTypeOptions] = await Promise.all([
    readActiveSettingsOptions("department"),
    readActiveSettingsOptions("marketingMeetingType"),
  ]);

  return (
    <MarketingMeetingManager
      departmentOptions={departmentOptions}
      initialRecords={records}
      meetingTypeOptions={meetingTypeOptions}
    />
  );
}
