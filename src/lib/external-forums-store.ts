import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  mutateJsonCollection,
  readJsonCollection,
  type JsonCollectionConfig,
} from "@/lib/sqlite-json-collection";
import type {
  ExternalForumFormValues,
  ExternalForumRecord,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const externalForumsPath = path.join(dataDir, "external-forums.json");
const legacyOwnerUserId = "admin-super-001";

const seedRecords: ExternalForumRecord[] = [
  {
    id: "forum-record-001",
    ownerUserId: legacyOwnerUserId,
    title: "中国环境监测产业发展论坛",
    organizer: "行业协会",
    meetingTime: "2026-05-12T09:00:00+08:00",
    location: "北京国际会议中心",
    attendees: ["李明", "周岚"],
    hasSpeech: true,
    speechTopic: "生态环境数字化监测实践",
    speaker: "李明",
    cost: 36000,
    costType: "sponsorship_fee",
    businessUnit: "环境事业部",
    sponsored: true,
    sponsorshipType: "论坛协办及展位",
    purposes: ["brand_exposure", "industry_exchange"],
    outputs: ["press_release", "photo"],
    followUp: "整理参会客户名单并同步销售运营。",
    notes: "年度重点行业论坛。",
    createdAt: "2026-04-20T08:30:00+08:00",
    updatedAt: "2026-05-15T18:20:00+08:00",
  },
  {
    id: "forum-record-002",
    ownerUserId: legacyOwnerUserId,
    title: "高校实验室安全与运维研讨会",
    organizer: "高校联盟",
    meetingTime: "2026-04-08T10:00:00+08:00",
    location: "南京",
    attendees: ["陈洁"],
    hasSpeech: false,
    cost: 4800,
    costType: "registration_fee",
    businessUnit: "教育行业线",
    sponsored: false,
    purposes: ["learning_research", "customer_maintenance"],
    outputs: ["minutes"],
    createdAt: "2026-03-28T14:00:00+08:00",
    updatedAt: "2026-04-09T12:10:00+08:00",
  },
];

const externalForumsCollection: JsonCollectionConfig<ExternalForumRecord> = {
  name: "external-forums",
  legacyPath: externalForumsPath,
  seedRecords,
  normalize: (record) => ({ ...record, ownerUserId: record.ownerUserId || legacyOwnerUserId }),
};

export async function readExternalForums(): Promise<ExternalForumRecord[]> {
  return readJsonCollection(externalForumsCollection);
}

export function persistExternalForumOwnershipMigration() {
  return mutateJsonCollection(externalForumsCollection, (records) => ({ records, result: undefined }));
}

function splitAttendees(value: string) {
  return value
    .split(/[,，、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formToRecord(
  values: ExternalForumFormValues,
  ownerUserId: string,
  existing?: ExternalForumRecord,
): ExternalForumRecord {
  const timestamp = new Date().toISOString();
  const hasSpeech = values.hasSpeech === "yes";
  const sponsored = values.sponsored === "yes";
  const costValue = Number(values.cost);

  return {
    id: existing?.id ?? `forum-record-${randomUUID()}`,
    ownerUserId: existing?.ownerUserId ?? ownerUserId,
    title: values.title.trim(),
    organizer: values.organizer.trim(),
    meetingTime: values.meetingTime
      ? `${
          values.meetingTime.length === 16
            ? `${values.meetingTime}:00`
            : values.meetingTime
        }+08:00`
      : timestamp,
    location: values.location.trim(),
    attendees: splitAttendees(values.attendeesText),
    hasSpeech,
    speechTopic: hasSpeech ? values.speechTopic.trim() : undefined,
    speaker: hasSpeech ? values.speaker.trim() : undefined,
    cost: values.cost.trim() ? costValue : undefined,
    costType: values.costType || undefined,
    businessUnit: values.businessUnit.trim(),
    sponsored,
    sponsorshipType: sponsored ? values.sponsorshipType.trim() : undefined,
    purposes: values.purposes,
    outputs: values.outputs,
    followUp: values.followUp.trim() || undefined,
    notes: values.notes.trim() || undefined,
    importKey: existing?.importKey,
    importedAt: existing?.importedAt,
    importBatchId: existing?.importBatchId,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

export async function createExternalForum(values: ExternalForumFormValues, ownerUserId: string) {
  return mutateJsonCollection(externalForumsCollection, (records) => {
    const record = formToRecord(values, ownerUserId);
    return { records: [record, ...records], result: record };
  });
}

export async function updateExternalForum(
  id: string,
  values: ExternalForumFormValues,
) {
  return mutateJsonCollection(externalForumsCollection, (records) => {
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

export async function deleteExternalForum(id: string) {
  return mutateJsonCollection(externalForumsCollection, (records) => {
    const exists = records.some((record) => record.id === id);
    return {
      records: exists ? records.filter((record) => record.id !== id) : records,
      result: exists,
    };
  });
}

export async function appendImportedExternalForums(
  importedRecords: ExternalForumRecord[],
) {
  return mutateJsonCollection(externalForumsCollection, (records) => {
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
