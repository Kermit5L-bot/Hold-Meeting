import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";
import type {
  MarketingMeetingFormValues,
  MarketingMeetingRecord,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const marketingMeetingsPath = path.join(dataDir, "marketing-meetings.json");
const legacyOwnerUserId = "admin-super-001";

const seedRecords: MarketingMeetingRecord[] = [
  {
    id: "marketing-record-001",
    ownerUserId: legacyOwnerUserId,
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
    ownerUserId: legacyOwnerUserId,
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

const marketingMeetingsCollection: JsonCollectionConfig<MarketingMeetingRecord> = {
  name: "marketing-meetings",
  legacyPath: marketingMeetingsPath,
  seedRecords,
  normalize: (record) => ({ ...record, ownerUserId: record.ownerUserId || legacyOwnerUserId }),
};

export async function readMarketingMeetings(): Promise<MarketingMeetingRecord[]> {
  return readJsonCollection(marketingMeetingsCollection);
}

export function persistMarketingOwnershipMigration() {
  return mutateJsonCollection(marketingMeetingsCollection, (records) => ({ records, result: undefined }));
}

function splitAttendees(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formToRecord(
  values: MarketingMeetingFormValues,
  ownerUserId: string,
  existing?: MarketingMeetingRecord,
): MarketingMeetingRecord {
  const timestamp = new Date().toISOString();
  const isOnline = values.locationType === "online";

  return {
    id: existing?.id ?? `marketing-record-${randomUUID()}`,
    ownerUserId: existing?.ownerUserId ?? ownerUserId,
    title: values.title.trim(),
    businessUnit: values.businessUnit.trim(),
    attendees: splitAttendees(values.attendeesText),
    meetingTime: values.meetingTime
      ? `${
          values.meetingTime.length === 16
            ? `${values.meetingTime}:00`
            : values.meetingTime
        }+08:00`
      : timestamp,
    locationType: values.locationType,
    onlineUrl: isOnline ? values.onlineUrl.trim() : undefined,
    offlineAddress: isOnline ? undefined : values.offlineAddress.trim(),
    meetingType: values.meetingType || undefined,
    conclusion: values.conclusion.trim() || undefined,
    followUp: values.followUp.trim() || undefined,
    notes: values.notes.trim() || undefined,
    importKey: existing?.importKey,
    importedAt: existing?.importedAt,
    importBatchId: existing?.importBatchId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function createMarketingMeeting(values: MarketingMeetingFormValues, ownerUserId: string) {
  return mutateJsonCollection(marketingMeetingsCollection, (records) => {
    const record = formToRecord(values, ownerUserId);
    return { records: [record, ...records], result: record };
  });
}

export async function updateMarketingMeeting(
  id: string,
  values: MarketingMeetingFormValues,
) {
  return mutateJsonCollection(marketingMeetingsCollection, (records) => {
    const existing = records.find((record) => record.id === id);

    if (!existing) {
      return { records, result: null };
    }

    const nextRecord = formToRecord(values, existing.ownerUserId, existing);
    return {
      records: records.map((record) =>
        record.id === id ? nextRecord : record,
      ),
      result: nextRecord,
    };
  });
}

export async function deleteMarketingMeeting(id: string) {
  return mutateJsonCollection(marketingMeetingsCollection, (records) => {
    const exists = records.some((record) => record.id === id);
    return {
      records: exists ? records.filter((record) => record.id !== id) : records,
      result: exists,
    };
  });
}

export async function appendImportedMarketingMeetings(
  importedRecords: MarketingMeetingRecord[],
) {
  return mutateJsonCollection(marketingMeetingsCollection, (records) => {
    const existingKeys = new Set(
      records.map((record) => `${record.ownerUserId}:${record.importKey}`).filter(Boolean),
    );
    const conflict = importedRecords.find(
      (record) => record.importKey && existingKeys.has(`${record.ownerUserId}:${record.importKey}`),
    );

    if (conflict) {
      throw new Error(
        `历史导入编号 ${conflict.importKey} 已存在，请重新预览后再导入。`,
      );
    }

    return {
      records: [...importedRecords, ...records],
      result: importedRecords,
    };
  });
}
