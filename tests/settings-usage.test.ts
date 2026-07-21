import assert from "node:assert/strict";
import test from "node:test";
import { countSettingsOptionReferences } from "../src/lib/settings-usage";
import type {
  ExternalForumRecord,
  MarketingMeetingRecord,
  OutreachMeeting,
  Registration,
  SettingsOption,
} from "../src/lib/types";

function option(category: SettingsOption["category"], value: string): SettingsOption {
  return {
    id: `${category}-${value}`,
    category,
    value,
    label: value,
    enabled: true,
    sortOrder: 0,
    createdAt: "2026-07-21T00:00:00.000Z",
    updatedAt: "2026-07-21T00:00:00.000Z",
  };
}

test("基础配置引用统计覆盖会议和报名记录", () => {
  const data = {
    outreachMeetings: [
      { businessUnit: "市场部", region: "华东" } as OutreachMeeting,
    ],
    externalForums: [
      {
        businessUnit: "市场部",
        costType: "registration_fee",
        purposes: ["industry_exchange"],
        outputs: ["minutes"],
      } as ExternalForumRecord,
    ],
    marketingMeetings: [
      { businessUnit: "市场部", meetingType: "regular" } as MarketingMeetingRecord,
    ],
    registrations: [
      { organizationType: "company" } as Registration,
    ],
  };

  assert.equal(countSettingsOptionReferences(option("department", "市场部"), data), 3);
  assert.equal(countSettingsOptionReferences(option("region", "华东"), data), 1);
  assert.equal(countSettingsOptionReferences(option("organizationType", "company"), data), 1);
  assert.equal(countSettingsOptionReferences(option("costType", "registration_fee"), data), 1);
  assert.equal(countSettingsOptionReferences(option("marketingMeetingType", "regular"), data), 1);
  assert.equal(countSettingsOptionReferences(option("attendancePurpose", "industry_exchange"), data), 1);
  assert.equal(countSettingsOptionReferences(option("meetingOutput", "minutes"), data), 1);
});
