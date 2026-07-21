import { readSettingsByCategory } from "@/lib/settings-store";
import type { AdminFormAllowedValues } from "@/lib/admin-form-request";

export async function readAdminFormAllowedValues(): Promise<AdminFormAllowedValues> {
  const [departments, regions, costTypes, attendancePurposes, meetingOutputs, marketingMeetingTypes] =
    await Promise.all([
      readSettingsByCategory("department"),
      readSettingsByCategory("region"),
      readSettingsByCategory("costType"),
      readSettingsByCategory("attendancePurpose"),
      readSettingsByCategory("meetingOutput"),
      readSettingsByCategory("marketingMeetingType"),
    ]);

  return {
    departments: new Set(departments.map((item) => item.value)),
    regions: new Set(regions.map((item) => item.value)),
    costTypes: new Set(costTypes.map((item) => item.value)),
    attendancePurposes: new Set(attendancePurposes.map((item) => item.value)),
    meetingOutputs: new Set(meetingOutputs.map((item) => item.value)),
    marketingMeetingTypes: new Set(marketingMeetingTypes.map((item) => item.value)),
  };
}
