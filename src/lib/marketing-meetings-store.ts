import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  MarketingMeetingFormValues,
  MarketingMeetingRecord,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const marketingMeetingsPath = path.join(dataDir, "marketing-meetings.json");

const seedRecords: MarketingMeetingRecord[] = [
  {
    id: "marketing-record-001",
    title: "营销中心月度复盘会",
    businessUnit: "营销中心",
    attendees: ["市场部", "客户工作组", "品牌组"],
    meetingTime: "2026-07-03T14:00:00+08:00",
    locationType: "online",
    onlineUrl: "企业微信会议",
    meetingType: "review",
    conclusion: "统一下半年重点活动数据口径。",
    followUp: "下次会议前补充重点活动复盘表。",
    createdAt: "2026-07-01T09:00:00+08:00",
    updatedAt: "2026-07-03T16:00:00+08:00",
  },
  {
    id: "marketing-record-002",
    title: "重点行业线索跟进协调会",
    businessUnit: "营销中心",
    attendees: ["市场部", "销售运营"],
    meetingTime: "2026-06-14T10:00:00+08:00",
    locationType: "offline",
    offlineAddress: "总部 12F 会议室",
    meetingType: "coordination",
    followUp: "销售运营同步线索跟进状态。",
    createdAt: "2026-06-10T17:30:00+08:00",
    updatedAt: "2026-06-14T11:30:00+08:00",
  },
];

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(marketingMeetingsPath, "utf8");
  } catch {
    await writeFile(
      marketingMeetingsPath,
      `${JSON.stringify(seedRecords, null, 2)}\n`,
      "utf8",
    );
  }
}

async function writeMarketingMeetings(records: MarketingMeetingRecord[]) {
  await ensureDataFile();
  await writeFile(
    marketingMeetingsPath,
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

export async function readMarketingMeetings(): Promise<MarketingMeetingRecord[]> {
  await ensureDataFile();
  const raw = await readFile(marketingMeetingsPath, "utf8");

  try {
    const parsed = JSON.parse(raw) as MarketingMeetingRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitAttendees(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formToRecord(
  values: MarketingMeetingFormValues,
  existing?: MarketingMeetingRecord,
): MarketingMeetingRecord {
  const timestamp = new Date().toISOString();
  const isOnline = values.locationType === "online";

  return {
    id:
      existing?.id ??
      `marketing-record-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title: values.title.trim(),
    businessUnit: values.businessUnit.trim(),
    attendees: splitAttendees(values.attendeesText),
    meetingTime: values.meetingTime
      ? `${values.meetingTime}:00+08:00`
      : timestamp,
    locationType: values.locationType,
    onlineUrl: isOnline ? values.onlineUrl.trim() : undefined,
    offlineAddress: isOnline ? undefined : values.offlineAddress.trim(),
    meetingType: values.meetingType || undefined,
    conclusion: values.conclusion.trim() || undefined,
    followUp: values.followUp.trim() || undefined,
    notes: values.notes.trim() || undefined,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function createMarketingMeeting(values: MarketingMeetingFormValues) {
  const records = await readMarketingMeetings();
  const record = formToRecord(values);
  await writeMarketingMeetings([record, ...records]);
  return record;
}

export async function updateMarketingMeeting(
  id: string,
  values: MarketingMeetingFormValues,
) {
  const records = await readMarketingMeetings();
  const existing = records.find((record) => record.id === id);

  if (!existing) {
    return null;
  }

  const nextRecord = formToRecord(values, existing);
  await writeMarketingMeetings(
    records.map((record) => (record.id === id ? nextRecord : record)),
  );
  return nextRecord;
}

export async function deleteMarketingMeeting(id: string) {
  const records = await readMarketingMeetings();
  await writeMarketingMeetings(records.filter((record) => record.id !== id));
}

export async function appendImportedMarketingMeetings(
  importedRecords: MarketingMeetingRecord[],
) {
  const records = await readMarketingMeetings();
  await writeMarketingMeetings([...importedRecords, ...records]);
  return importedRecords;
}
