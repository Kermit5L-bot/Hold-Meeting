import { readExternalForums } from "@/lib/external-forums-store";
import { readMarketingMeetings } from "@/lib/marketing-meetings-store";
import { readOutreachMeetings } from "@/lib/outreach-meetings-store";
import { readRegistrations } from "@/lib/registrations-store";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
  SettingsOption,
} from "@/lib/types";

interface SettingsUsageData {
  outreachMeetings: OutreachMeeting[];
  externalForums: ExternalForumRecord[];
  marketingMeetings: MarketingMeetingRecord[];
  registrations: Registration[];
}

export function countSettingsOptionReferences(
  option: SettingsOption,
  data: SettingsUsageData,
) {
  switch (option.category) {
    case "department":
      return (
        data.outreachMeetings.filter((item) => item.businessUnit === option.value).length +
        data.externalForums.filter((item) => item.businessUnit === option.value).length +
        data.marketingMeetings.filter((item) => item.businessUnit === option.value).length
      );
    case "region":
      return data.outreachMeetings.filter((item) => item.region === option.value).length;
    case "organizationType":
      return data.registrations.filter((item) => item.organizationType === option.value).length;
    case "costType":
      return data.externalForums.filter((item) => item.costType === option.value).length;
    case "marketingMeetingType":
      return data.marketingMeetings.filter((item) => item.meetingType === option.value).length;
    case "attendancePurpose":
      return data.externalForums.filter((item) => item.purposes.includes(option.value)).length;
    case "meetingOutput":
      return data.externalForums.filter((item) => item.outputs.includes(option.value)).length;
  }
}

export async function readSettingsOptionReferenceCount(option: SettingsOption) {
  const [outreachMeetings, externalForums, marketingMeetings, registrations] =
    await Promise.all([
      readOutreachMeetings(),
      readExternalForums(),
      readMarketingMeetings(),
      readRegistrations(),
    ]);

  return countSettingsOptionReferences(option, {
    outreachMeetings,
    externalForums,
    marketingMeetings,
    registrations,
  });
}
